'use client';

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    setDoc,
    Unsubscribe,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import db from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// WebRTC configuration
export const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.l.google.com:5349' },
        { urls: 'stun:stun1.l.google.com:3478' },
        { urls: 'stun:stun1.l.google.com:5349' },
    ],
    iceCandidatePoolSize: 10,
};

export function useVideoChat({ meetCode, userId, isMicOn, isVideoOn, localVideoRef }) {
    const [remoteStreams, setRemoteStreams] = useState<
    Map<string, MediaStream>
    >(new Map());
    const [peerConnections, setPeerConnections] = useState<
    Map<string, RTCPeerConnection>
    >(new Map());
    const [retriedPC, setRetriedPC] = useState([]);
    const unsubscribeRefs = useRef<Unsubscribe[]>([]);
    const localPcs = useRef<RTCPeerConnection[]>([]);
    const localStreamRef = useRef<MediaStream | null>(null);

    const router = useRouter();

    const enableLogs = process.env.NODE_ENV === 'development';

    useEffect(() => {
        try {
            (async () => {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                stream.getTracks().forEach((track) => track.enabled = false);
                localStreamRef.current = stream;
                if (localStreamRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            })();
        } catch (e) {
            console.error('Error accessing media devices:', e);
        }
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
        }
    }, []);

    useEffect(() => {
        localStreamRef.current?.getAudioTracks().forEach((track) => track.enabled = isMicOn);
    }, [isMicOn]);

    useEffect(() => {
        localStreamRef.current?.getVideoTracks().forEach((track) => track.enabled = isVideoOn);
        if (localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [isVideoOn])

    function removePeerConnection(peerId: string) {
        setPeerConnections((prev) => {
            const updatedMap = new Map(prev);
            updatedMap.delete(peerId);
            return updatedMap;
        });
        setRemoteStreams((prev) => {
            const updatedMap = new Map(prev);
            updatedMap.get(peerId)?.getTracks().forEach((track) => track.stop());
            updatedMap.delete(peerId);
            return updatedMap;
        });
    }

    useEffect(() => {
        if (peerConnections.size === 0) {
            remoteStreams.forEach((stream) => {
                stream.getTracks().forEach((track) => track.stop());
            })
            setRemoteStreams(new Map());
        }
        peerConnections.forEach((pc, peerId) => {
            pc.onconnectionstatechange = async () => {
                if (pc.connectionState === 'disconnected') {
                    pc.close();
                    removePeerConnection(peerId);
                    await deleteDoc(
                        doc(db, `calls/${meetCode}/participants/${peerId}`)
                    );
                } else if (pc.connectionState === 'failed') {
                    pc.close();
                    removePeerConnection(peerId);
                } else if (pc.connectionState === 'closed') {
                    removePeerConnection(peerId);
                }
            };
        });
    }, [peerConnections]);

    useEffect(() => {
        try {
            if (document?.hasFocus()) {
                setTimeout(() => {
                    navigator.clipboard?.writeText(meetCode)
                    .then(() => {console.log('Meet code', meetCode,  'copied to clipboard')})
                    .catch(e => console.log('clipboard err:', e));
                }, 0)
            }
            if (meetCode && userId) {
                initializeMeet();
            }
        } catch (err) {
            console.error('Error in connecting to meet');
            router.replace('/');
        }
        return () => {
            // Cleanup
            if (meetCode && userId) {
                (async () => {
                    if (peerConnections.size === 0) {
                        await deleteDoc(doc(db, `calls/${meetCode}`));
                    } else {
                        await deleteDoc(doc(db, `calls/${meetCode}/participants/${userId}`));
                        await deleteDoc(doc(db, `calls/${meetCode}/offers/${userId}`));
                        peerConnections.forEach((pc) => pc.close());
                    }
                })();
                unsubscribeRefs.current.forEach((unsubcribe) => unsubcribe()); // Includes firestore listeners
            }
            localPcs.current.forEach((pc) => pc.close());
            enableLogs && console.log('cleaned up video chat');
        };
    }, [meetCode, userId]);

    async function initializeMeet() {
        enableLogs && console.log(new Date(), 'initializing meet');

        const meetDoc = await getDoc(doc(db, 'calls', meetCode));

        if (!meetDoc.exists()) {
            alert('Invalid meeting code');
            router.replace('/');
            return;
        }

        // Add participant to the meeting
        const joinedAt = performance.now() + performance.timeOrigin;
        await setDoc(doc(collection(db, 'calls', meetCode, 'participants'), userId), {
            userId,
            joinedAt,
        })

        // Listen for new participants
        const unsubscribeParticipants = onSnapshot(
            collection(db, 'calls', meetCode, 'participants'),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    const peerId = change.doc.id;
                    const data = change.doc.data();
                    enableLogs && console.log('participant change', change.type, peerId);
                    if (change.type === 'added' && peerId !== userId && !peerConnections.has(peerId) && data.joinedAt > joinedAt) {
                        enableLogs && console.log('new participant', peerId);
                        await sendOffer(userId, peerId);
                    } else if (change.type === 'removed') {
                        removePeerConnection(peerId);
                    }
                });
            }
        );
        unsubscribeRefs.current.push(unsubscribeParticipants);

        // Listen for offers
        const unsubscribeOffers = onSnapshot(collection(db, 'calls', meetCode, 'offers', userId, 'collection'),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const peerId = data.fromPeerId;
                        delete data.fromPeerId;
                        enableLogs && console.log('offer change', change.type, peerId);
                        if (peerId !== userId && userId && peerId) {
                            enableLogs && console.log('sending new answer', peerId);
                            await sendAnswer(userId, peerId, data);
                        }
                    }
                });
            }
        );
        unsubscribeRefs.current.push(unsubscribeOffers);
    }

    async function sendAnswer(userId: string, peerId: string, offerData: any) {
        let pc: RTCPeerConnection;
        if (peerConnections.has(peerId)) {
            pc = peerConnections.get(peerId);
            enableLogs && console.log('sendAnswer: pc for',peerId, 'from', userId);
        } else {
            pc = new RTCPeerConnection(servers);
            enableLogs && console.log('sendAnswer: new pc created for',peerId, 'from', userId);
            localPcs.current.push(pc);
            // Store peer connection
            setPeerConnections((prev) => new Map(prev.set(peerId, pc)));
        }
        if (pc.signalingState === 'closed') return;

        // Add local tracks to peer connection
        if (localStreamRef.current) {
            const pcSenders = pc.getSenders();
            const addedTracks = pcSenders.map((sender) => sender.track?.id);
            localStreamRef.current?.getTracks().forEach((track) => {
                if (track.id && !addedTracks.includes(track.id)) {
                    pc.addTrack(track, localStreamRef.current);
                }
            });
        } else {
            enableLogs && console.log('localStreamRef.current is null');
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0] as MediaStream;
            enableLogs && console.log(
                stream?.getTracks().map((o) => `${peerId}==${o.id}==${o.kind}`),
                'from handleOffer'
            );
            setRemoteStreams((prev) => new Map(prev.set(peerId, stream)));
        };

        pc.onicegatheringstatechange = async () => {
            enableLogs && console.log(
                `ICE gathering state for peer ${peerId}:`,
                pc.iceGatheringState
            );
        };

        // Log ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            enableLogs && console.log(
                `ICE connection state for peer ${peerId}:`,
                pc.iceConnectionState
            );
            if (pc.iceConnectionState === 'failed') {
                enableLogs && console.log('ICE connection failed for peer', peerId, 'Restarting...');
                pc.restartIce();
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(
                    collection(
                        db,
                        'calls',
                        meetCode,
                        'candidates',
                        `${userId}-${peerId}`,
                        'collection'
                    ),
                    event.candidate.toJSON()
                );
            }
        };

        // Add connection state change logging
        pc.onconnectionstatechange = () => {
            enableLogs && console.log(
                `Connection state for peer ${peerId}:`,
                pc.connectionState
            );
        };

        pc.onsignalingstatechange = () => {
            enableLogs && console.log(
                `Signaling state for peer ${peerId}:`,
                pc.signalingState
            );
        };

        // Set remote description (offer)
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));
        // Create and set local description (answer)
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer
        await setDoc(
            doc(db, 'calls', meetCode, 'answers', `${userId}-${peerId}`),
            {
                type: answer.type,
                sdp: answer.sdp,
            }
        );

        // Listen for ICE candidates from the offering peer
        const unsubscribeCandidates = onSnapshot(
            collection(
                db,
                'calls',
                meetCode,
                'candidates',
                `${peerId}-${userId}`,
                'collection'
            ),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    const data = change.doc.data();
                    const pc = peerConnections.get(peerId);
                    enableLogs && console.log('adding offcandidates', change.type, peerId);
                    if (
                        change.type === 'added' &&
                        data &&
                        pc?.signalingState !== 'closed' &&
                        !!pc?.remoteDescription
                    ) {
                        const candidate = new RTCIceCandidate(data);
                        try {
                            await pc.addIceCandidate(candidate);
                        } catch (e) {
                            enableLogs && console.error('Error adding ice candidate:', e);
                            alert('Some error occurred in connecting someone. Please try again.');
                        }
                    }
                });
            }
        );

        let timeout = null;
        pc.onicecandidateerror = (event) => {
            if (timeout) return;
            if (retriedPC.includes(peerId)) {
                enableLogs && console.log('Network error with ', peerId, event.errorText);
                return;
            }
            if (pc.connectionState === 'new') {
                enableLogs && console.log('ICE candidate error: restarting ICE', peerId);
                pc.close();
                unsubscribeCandidates();
                retriedPC.push(peerId);
            } else {
                enableLogs && console.log('ICE candidate error:', event.errorText, peerId);
            }
            timeout = setTimeout(() => {
                timeout = null
            }, 2000);
        }
        
        unsubscribeRefs.current.push(unsubscribeCandidates);
    }

    async function sendOffer(userId: string, peerId: string) {
        const pc = new RTCPeerConnection(servers);
        enableLogs && console.log('sendOffer: new pc created for', peerId, 'from', userId);
        localPcs.current.push(pc);

        // Store peer connection
        setPeerConnections((prev) => new Map(prev.set(peerId, pc)));

        // Log ICE gathering state changes
        pc.onicegatheringstatechange = async () => {
            enableLogs && console.log(
                `ICE gathering state for peer ${peerId}:`,
                pc.iceGatheringState
            );
        };

        // Log ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            enableLogs && console.log(
                `ICE connection state for peer ${peerId}:`,
                pc.iceConnectionState
            );
            if (pc.iceConnectionState === 'failed') {
                enableLogs && console.log('ICE connection failed for peer', peerId, 'Restarting...');
                pc.restartIce();
            }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            enableLogs && console.log(
                stream?.getTracks().map((o) => `${peerId}==${o.id}==${o.kind}`),
                'from createPeerConnection'
            );
            setRemoteStreams((prev) => new Map(prev.set(peerId, stream)));
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(
                    collection(
                        db,
                        'calls',
                        meetCode,
                        'candidates',
                        `${userId}-${peerId}`,
                        'collection'
                    ),
                    event.candidate.toJSON()
                );
            }
        };

        pc.onnegotiationneeded = async () => {
            enableLogs && console.log('Negotiation needed for peer', peerId);
            try {
                // Check if an offer/answer exchange is already in progress
                if (pc.iceConnectionState === "connected" || 
                    pc.iceConnectionState === "new") {
                    
                    // If there is an ongoing negotiation, we should not create a new offer
                    if (pc.signalingState === "have-local-offer" || 
                        pc.signalingState === "have-remote-offer") {
                        enableLogs && console.log("Negotiation is in progress, skipping offer creation.");
                        return; // Skip creating a new offer
                    }
        
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
        
                    await addDoc(
                        collection(
                            db,
                            'calls',
                            meetCode,
                            'offers',
                            `${peerId}`,
                            'collection'
                        ),
                        {
                            sdp: offer.sdp,
                            type: offer.type,
                            fromPeerId: userId,
                        }
                    );
                } else {
                    enableLogs && console.log("Connection is not in a valid state for offer creation.");
                }
            } catch (error) {
                enableLogs && console.error("Error during negotiation:", error);
            }
        };

        // Add local tracks to peer connection
        if (localStreamRef.current) {
            const pcSenders = pc.getSenders();
            const addedTracks = pcSenders.map((sender) => sender.track?.id);
            localStreamRef.current?.getTracks().forEach((track) => {
                if (track.id && !addedTracks.includes(track.id)) {
                    pc.addTrack(track, localStreamRef.current);
                }
            });
        } else {
            console.log('localStreamRef.current is null');
        }

        pc.onsignalingstatechange = () => {
            enableLogs && console.log(
                `Signaling state for peer ${peerId}:`,
                pc.signalingState
            );
        };

        // Listen for answer
        const unsubscribeAnswers = onSnapshot(
            doc(db, 'calls', meetCode, 'answers', `${peerId}-${userId}`),
            async (snapshot) => {
                const data = snapshot.data();
                if (
                    !pc.currentRemoteDescription &&
                    data?.type &&
                    pc?.signalingState !== 'stable' &&
                    pc.signalingState !== 'closed'
                ) {
                    await pc.setRemoteDescription(
                        new RTCSessionDescription(
                            data as RTCSessionDescriptionInit
                        )
                    );
                }
            }
        );

        unsubscribeRefs.current.push(unsubscribeAnswers);

        // Listen for ICE candidates from the answering peer
        const unsubscribeCandidates = onSnapshot(
            collection(
                db,
                'calls',
                meetCode,
                'candidates',
                `${peerId}-${userId}`,
                'collection'
            ),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    const data = change.doc.data();
                    const pc = peerConnections.get(peerId);
                    enableLogs && console.log('adding anscandidates', change.type, peerId);
                    if (
                        change.type === 'added' &&
                        data &&
                        pc?.signalingState !== 'closed' &&
                        !!pc?.remoteDescription
                    ) {
                        const candidate = new RTCIceCandidate(data);
                        await pc.addIceCandidate(candidate);
                    }
                });
            }
        );

        let timeout = null;
        pc.onicecandidateerror = (event) => {
            if (timeout) return;
            if (retriedPC.includes(peerId)) {
                enableLogs && console.log('Network error with ', peerId, event.errorText);
                return;
            }
            if (pc.connectionState === 'new') {
                enableLogs && console.log('ICE candidate error: restarting ICE', peerId);
                pc.close();
                unsubscribeAnswers();
                unsubscribeCandidates();
                sendOffer(userId, peerId);
                retriedPC.push(peerId);
            } else {
                enableLogs && console.log('ICE candidate error:', event.errorText, peerId);
            }
            timeout = setTimeout(() => {
                timeout = null
            }, 2000);
        }
        
        unsubscribeRefs.current.push(unsubscribeCandidates);
    }

    return {localStream: localStreamRef.current, remoteStreams, peerConnections};
}
