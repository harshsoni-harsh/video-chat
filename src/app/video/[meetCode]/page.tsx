'use client';

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    setDoc,
    writeBatch,
} from 'firebase/firestore';
import React, { Usable, use, useEffect, useRef, useState } from 'react';
import db from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import LocalVideo from '@/components/LocalVideo';
import Controls from '@/components/Controls';
import RemoteVideo from '@/components/RemoteVideo';

// WebRTC configuration
const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
    sdpSemantics: 'plan-b',
};

export default function VideoChat({
    params,
}: {
    params: Usable<any>;
}) {
    const [isMicOn, setMicOn] = useState(true);
    const [isVideoOn, setVideoOn] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<
        Map<string, MediaStream>
    >(new Map());
    const [peerConnections, setPeerConnections] = useState<
        Map<string, RTCPeerConnection>
    >(new Map());
    const [userId, setUserId] = useState<string>('');
    const debouncedTimeoutRef = useRef(null); // For setupLocalMedia function

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();
    const { meetCode } = use(params);

    // const cleanupInactiveStreams = useCallback(() => {
    //     setRemoteStreams(prev => {
    //         const newStreams = new Map();
    //         prev.forEach((stream, peerId) => {
    //             if (stream.active) {
    //                 newStreams.set(peerId, stream);
    //             }
    //         });
    //         console.log(userId, newStreams);
    //         return newStreams;
    //     });
    // }, []);

    // // Add cleanup effect
    // useEffect(() => {
    //     const cleanup = setInterval(cleanupInactiveStreams, 5000);
    //     return () => clearInterval(cleanup);
    // }, [cleanupInactiveStreams]);
    
    function removePeerConnection(peerId: string) {
        setPeerConnections((prev) => {
            const updatedMap = new Map(prev);
            updatedMap.delete(peerId);
            return updatedMap;
        });
        setRemoteStreams((prev) => {
            const updatedMap = new Map(prev);
            updatedMap.delete(peerId);
            return updatedMap;
        });
    }

    useEffect(() => {console.log('uf', remoteStreams)}, [remoteStreams])

    console.log(
        userId,
        peerConnections,
        localStream?.id,
        localStream?.getTracks().map((o) => `${o.id}:${o.kind}`),
        remoteStreams.forEach((x, peer) =>
            x?.getTracks().map((o) => `peer-${peer}.${o.id}:${o.kind}`)
        )
    );
    useEffect(() => {
        console.log('pcs uf');
        if (peerConnections.size === 0) {
            setRemoteStreams(new Map());
        }
        peerConnections.forEach((pc, peerId) => {
            console.log(peerId);
            pc.onconnectionstatechange = async () => {
                console.log(
                    `Connection state for peer ${peerId}:`,
                    pc.connectionState
                );
                if (pc.connectionState === 'disconnected') {
                    console.log('Closing peer connection:', peerId);
                    pc.close();
                    removePeerConnection(peerId);
                    await deleteDoc(
                        doc(db, `calls/${meetCode}/participants/${peerId}`)
                    );
                } else if (pc.connectionState === 'failed') {
                    console.info('Re establishing peer connection:', peerId);
                    pc.close();
                    sendOffer(userId, peerId);
                    removePeerConnection(peerId);
                } else if (pc.connectionState === 'closed') {
                    console.log('Removing closed peer connection:', peerId);
                    removePeerConnection(peerId);
                }
            };
        });
    }, [peerConnections]);

    useEffect(() => {
        console.log('mc uf');
        try {
            if (document?.hasFocus()) {
                navigator.clipboard?.writeText(meetCode);
            }
            if (meetCode) {
                initializeMeet();
            }
        } catch (err) {
            console.error('Error in connecting to meet');
            router.replace('/');
        }
        return () => {
            // Cleanup
            localStream?.getTracks().forEach((track) => track.stop());
            peerConnections.forEach((pc) => pc.close());
            (async () => {
                if (peerConnections.size === 0) {
                    await deleteDoc(doc(db, `calls/${meetCode}`));
                }
            })();
        };
    }, [meetCode]);

    async function initializeMeet() {
        console.log(new Date(), 'initializing meet');
        
        const userId = `user-${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        setUserId(userId);

        const meetDoc = await getDoc(doc(db, 'calls', meetCode));

        if (!meetDoc.exists()) {
            alert('Invalid meeting code');
            router.replace('/');
            return;
        }

        await setupLocalMedia();

        // Add participant to the meeting
        const joinedAt = performance.now() + performance.timeOrigin;
        await setDoc(doc(collection(db, 'calls', meetCode, 'participants'), userId), {
            userId,
            joinedAt,
        })

        // Listen for new participants
        onSnapshot(
            collection(db, 'calls', meetCode, 'participants'),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    const peerId = change.doc.id;
                    const data = change.doc.data();
                    if (change.type === 'added' && peerId !== userId && !peerConnections.has(peerId) && data.joinedAt > joinedAt) {
                        console.log('new participant', peerId);
                        await sendOffer(userId, peerId);
                    }
                });
            }
        );

        // Listen for offers
        onSnapshot(collection(db, 'calls', meetCode, 'offers', userId, 'collection'),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const peerId = data.fromPeerId;
                        delete data.fromPeerId;
                        if (peerId !== userId && userId && peerId) {
                            console.log('sending new answer', peerId);
                            await sendAnswer(userId, peerId, data);
                        }
                    }
                });
            }
        );
    }

    useEffect(() => {
        console.log('imo ivo uf');
        // Clear any previous timeout to debounce
        if (debouncedTimeoutRef.current) {
            localStream?.getAudioTracks()?.forEach((track) => track.stop());
            localStream?.getVideoTracks()?.forEach((track) => track.stop());
            clearTimeout(debouncedTimeoutRef.current);
        }
        debouncedTimeoutRef.current = setTimeout(() => {
            if (!isVideoOn) {
                localVideoRef.current.srcObject = null;
                localStream?.getVideoTracks()?.forEach((track) => track.stop());
            }
            if (!isMicOn) {
                localStream?.getAudioTracks()?.forEach((track) => track.stop());
            }
            if (isMicOn || isVideoOn) {
                setupLocalMedia();
            }
        }, 300); // Debouncing of 300 ms for effectiveness

        return () => {
            if (debouncedTimeoutRef.current) {
                clearTimeout(debouncedTimeoutRef.current);
            }
        };
    }, [isMicOn, isVideoOn]);

    async function setupLocalMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideoOn,
                audio: isMicOn,
            });
            setLocalStream(stream);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Add tracks to all existing peer connections
            peerConnections.forEach((pc, peerId) => {
                if (pc && pc.signalingState !== 'closed') {
                    stream.getTracks().forEach((track) => {
                        pc.addTrack(track, stream);
                    });
                } else {
                    // peerConnections.delete(peerId);
                    // remoteStreams.delete(peerId);
                    // console.log('Removing closed peer connection:', peerId);
                }
            });
            return stream;
        } catch (err) {
            console.error('Error accessing media devices:', err);
            return null;
        }
    }

    async function sendAnswer(userId: string, peerId: string, offerData: any) {
        const pc = new RTCPeerConnection(servers);
        const candidateBuffer = [];

        // Store peer connection
        setPeerConnections((prev) => new Map(prev.set(peerId, pc)));

        // Add local tracks to peer connection
        if (localStream) {
            const pcSenders = pc.getSenders();
            const addedTracks = pcSenders.map((sender) => sender.track?.id);
            localStream?.getTracks().forEach((track) => {
                if (track.id && !addedTracks.includes(track.id)) {
                    pc.addTrack(track, localStream);
                }
            });
        } else {
            const stream = await setupLocalMedia();
            const pcSenders = pc.getSenders();
            const addedTracks = pcSenders.map((sender) => sender.track?.id);
            stream?.getTracks().forEach((track) => {
                if (track.id && !addedTracks.includes(track.id)) {
                    pc.addTrack(track, stream);
                }
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0] as MediaStream;
            console.log(
                stream?.getTracks().map((o) => `${peerId}==${o.id}==${o.kind}`),
                'from handleOffer'
            );
            setRemoteStreams((prev) => new Map(prev.set(peerId, stream)));
        };

        pc.onicegatheringstatechange = async () => {
            console.log(
                `ICE gathering state for peer ${peerId}:`,
                pc.iceGatheringState
            );
            if (pc.iceGatheringState === 'complete') {
                console.log('flushing', [...candidateBuffer]);
                const batch = writeBatch(db);
                candidateBuffer.forEach((candidate) => {
                    const docRef = doc(
                        collection(
                            db,
                            'calls',
                            meetCode,
                            'candidates',
                            `${userId}-${peerId}`,
                            'collection'
                        )
                    );
                    batch.set(docRef, candidate);
                });
                await batch.commit();
                candidateBuffer.splice(0);
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                candidateBuffer.push(event.candidate.toJSON());
            }
        };

        // Add connection state change logging
        pc.onconnectionstatechange = () => {
            console.log(
                `Connection state for peer ${peerId}:`,
                pc.connectionState
            );
        };

        pc.onsignalingstatechange = () => {
            console.log(
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
        onSnapshot(
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
                    console.log('adding offcandidates', change.type, peerId);
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
    }

    async function sendOffer(userId: string, peerId: string) {
        const pc = new RTCPeerConnection(servers);
        const candidateBuffer = [];

        // Store peer connection
        setPeerConnections((prev) => new Map(prev.set(peerId, pc)));

        // Log ICE gathering state changes
        pc.onicegatheringstatechange = async () => {
            console.log(
                `ICE gathering state for peer ${peerId}:`,
                pc.iceGatheringState
            );
            if (pc.iceGatheringState === 'complete') {
                console.log('flushing', candidateBuffer);
                const batch = writeBatch(db);
                candidateBuffer.forEach((candidate) => {
                    const docRef = doc(
                        collection(
                            db,
                            'calls',
                            meetCode,
                            'candidates',
                            `${userId}-${peerId}`,
                            'collection'
                        )
                    );
                    batch.set(docRef, candidate);
                });
                await batch.commit();
                candidateBuffer.splice(0);
            }
        };

        // Log ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.log(
                `ICE connection state for peer ${peerId}:`,
                pc.iceConnectionState
            );
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            console.log(
                stream?.getTracks().map((o) => `${peerId}==${o.id}==${o.kind}`),
                'from createPeerConnection'
            );
            setRemoteStreams((prev) => new Map(prev.set(peerId, stream)));
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                candidateBuffer.push(event.candidate.toJSON());
            }
        };

        pc.onnegotiationneeded = async () => {
            // Create and send offer
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
        };

        // Add local tracks to peer connection
        if (localStream) {
            const pcSenders = pc.getSenders();
            const addedTracks = pcSenders.map((sender) => sender.track?.id);
            localStream?.getTracks().forEach((track) => {
                if (track.id && !addedTracks.includes(track.id)) {
                    pc.addTrack(track, localStream);
                }
            });
        } else {
            const stream = await setupLocalMedia();
            const pcSenders = pc.getSenders();
            const addedTracks = pcSenders.map((sender) => sender.track?.id);
            stream?.getTracks().forEach((track) => {
                if (track.id && !addedTracks.includes(track.id)) {
                    pc.addTrack(track, stream);
                }
            });
        }

        pc.onsignalingstatechange = () => {
            if (!pc.remoteDescription && pc.signalingState === 'stable') {
                sendOffer(userId, peerId);
            }
        };

        // Listen for answer
        onSnapshot(
            doc(db, 'calls', meetCode, 'answers', `${peerId}-${userId}`),
            async (snapshot) => {
                const data = snapshot.data();
                if (
                    !pc.currentRemoteDescription &&
                    data?.type &&
                    pc.signalingState !== 'stable'
                ) {
                    await pc.setRemoteDescription(
                        new RTCSessionDescription(
                            data as RTCSessionDescriptionInit
                        )
                    );
                }
            }
        );

        // Listen for ICE candidates from the answering peer
        onSnapshot(
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
                    console.log('adding anscandidates', change.type, peerId);
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
    }

    const toggleMic = () => setMicOn((prev) => !prev);
    const toggleVideo = () => setVideoOn((prev) => !prev);

    function disconnectCall() {
        localStream?.getTracks().forEach((track) => track.stop());
        peerConnections.forEach((pc) => pc.close());
        router.replace('/');
    }

    return (
        <div className="flex flex-col h-screen items-center w-screen">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 w-full">
                <LocalVideo localStream={localStream} userId={userId} />
                {Array.from(remoteStreams).map(([peerId, stream]) => (
                    <RemoteVideo key={peerId} peerId={peerId} stream={stream} />
                ))}
            </div>
            <Controls
                isMicOn={isMicOn}
                isVideoOn={isVideoOn}
                toggleMic={toggleMic}
                toggleVideo={toggleVideo}
                disconnectCall={disconnectCall}
            />
        </div>
    );
}
