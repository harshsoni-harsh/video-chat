'use client';

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
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
    ],
    iceCandidatePoolSize: 10,
};

export function useVideoChat({
    meetCode,
    userId,
    isMicOn,
    isVideoOn,
    localVideoRef,
    isProctor
}: {
    meetCode: string,
    userId: string,
    isMicOn: boolean,
    isVideoOn: boolean,
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>,
    isProctor?: boolean
}) {
    const [remoteStreams, setRemoteStreams] = useState<
        Map<string, MediaStream>
    >(new Map());
    const [peerConnections, setPeerConnections] = useState<
        Map<string, RTCPeerConnection>
    >(new Map());
    const unsubscribeRefs = useRef<Unsubscribe[]>([]);
    const localPcs = useRef<RTCPeerConnection[]>([]);
    const localStreamRef = useRef<MediaStream[] | null>([]);

    const router = useRouter();

    const enableLogs = process.env.NODE_ENV === 'development';
    const meetCollection = isProctor ? "proctor" : "calls"

    useEffect(() => {
        try {
            (async () => {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                videoStream
                    .getTracks()
                    .forEach((track) => (track.enabled = false));
                audioStream
                    .getTracks()
                    .forEach((track) => (track.enabled = false));
                localStreamRef.current.push(videoStream, audioStream);
                if (localStreamRef.current && localStreamRef.current.length > 0) {
                    localVideoRef.current.srcObject = videoStream;
                }
            })();
        } catch (e) {
            console.error('Error accessing media devices:', e);
        }
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.forEach((stream) =>
                    stream.getTracks().forEach((track) => track.stop())
                );
            }
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
        };
    }, []);

    useEffect(() => {
        localStreamRef.current
            ?.at(1)
            ?.getAudioTracks()
            .forEach((track) => (track.enabled = isMicOn));
    }, [isMicOn]);

    useEffect(() => {
        localStreamRef.current
            ?.at(0)
            ?.getVideoTracks()
            .forEach((track) => (track.enabled = isVideoOn));
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current[0];
        }
    }, [isVideoOn]);

    function removePeerConnection(peerId: string) {
        setPeerConnections((prev) => {
            const updatedMap = new Map(prev);
            updatedMap.delete(peerId);
            return updatedMap;
        });
        setRemoteStreams((prev) => {
            const updatedMap = new Map(prev);
            updatedMap
                .get(peerId)
                ?.getTracks()
                .forEach((track) => track.stop());
            updatedMap.delete(peerId);
            return updatedMap;
        });
    }

    useEffect(() => {
        if (peerConnections.size === 0) {
            remoteStreams.forEach((stream) => {
                stream.getTracks().forEach((track) => track.stop());
            });
            setRemoteStreams(new Map());
        }
        peerConnections.forEach((pc, peerId) => {
            pc.onconnectionstatechange = async () => {
                if (pc.connectionState === 'disconnected') {
                    pc.close();
                    removePeerConnection(peerId);
                    await deleteDoc(
                        doc(db, `${meetCollection}/${meetCode}/participants/${peerId}`)
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
                    navigator.clipboard
                        ?.writeText(meetCode)
                        .then(() => {
                            console.log(
                                'Meet code',
                                meetCode,
                                'copied to clipboard'
                            );
                        })
                        .catch((e) => console.log('clipboard err:', e));
                }, 0);
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
            if (isProctor) {
                getDoc(doc(db, meetCollection, meetCode)).then(meetDoc => {
                    const meetData = meetDoc.data();
                    if (meetData.proctorId === userId) {
                        setDoc(doc(db, meetCollection, meetCode), {ended: true}, {merge: true});
                    }
                    unsubscribeRefs.current.forEach((unsubcribe) => unsubcribe());
                    localPcs.current.forEach((pc) => pc.close());
                    enableLogs && console.log('proctoring session ended');
                })
            } else {
                if (meetCode && userId) {
                    (async () => {
                        if (peerConnections.size === 0) {
                            await deleteDoc(doc(db, `${meetCollection}/${meetCode}`));
                        } else {
                            await deleteDoc(
                                doc(db, `${meetCollection}/${meetCode}/participants/${userId}`)
                            );
                            await deleteDoc(
                                doc(db, `${meetCollection}/${meetCode}/offers/${userId}`)
                            );
                            peerConnections.forEach((pc) => pc.close());
                        }
                    })();
                    unsubscribeRefs.current.forEach((unsubcribe) => unsubcribe()); // Includes firestore listeners
                }
                localPcs.current.forEach((pc) => pc.close());
                enableLogs && console.log('cleaned up video chat');
            }
        };
    }, [meetCode, userId]);

    async function initializeMeet() {
        enableLogs && console.log(new Date(), 'initializing meet');

        const meetDoc = await getDoc(doc(db, meetCollection, meetCode));
        const meetData = meetDoc?.data();

        if (!meetDoc.exists() || meetData?.ended) {
            alert('Invalid meeting code');
            router.replace('/');
            return;
        }

        const proctorId = meetData?.proctorId;
        const participants = await getDocs(
            collection(db, meetCollection, meetCode, 'participants')
        );

        if (isProctor) {
            if (proctorId !== userId) {
                startPeerConnection(proctorId);
            }
        } else {
            participants.forEach((participant) => {
                const data = participant.data();
                const peerId = data.userId;
                if (data.userId !== userId) {
                    startPeerConnection(peerId);
                }
            });
        }

        // Add participant to the meeting
        const joinedAt = performance.now() + performance.timeOrigin;
        await setDoc(
            doc(collection(db, meetCollection, meetCode, 'participants'), userId),
            {
                userId,
                joinedAt,
            }
        );
     
        if (isProctor) {
            if (proctorId === userId) {
                listenOffers();
            }
        } else {
            listenOffers();
        }

    }

    async function sendOffer(pc: RTCPeerConnection, peerId: string) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await addDoc(
            collection(
                db,
                meetCollection,
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
    }

    async function sendAnswer(
        pc: RTCPeerConnection,
        peerId: string,
        offerData: any
    ) {
        // Set remote description (offer)
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));
        // Create and set local description (answer)
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer
        await setDoc(
            doc(db, meetCollection, meetCode, 'answers', `${userId}-${peerId}`),
            {
                type: answer.type,
                sdp: answer.sdp,
            }
        );
    }

    async function PCFunctionsInit(
        userId: string,
        peerId: string,
        pc: RTCPeerConnection
    ) {
        // Log ICE gathering state changes
        pc.onicegatheringstatechange = async () => {
            enableLogs &&
                console.log(
                    `ICE gathering state for peer ${peerId}:`,
                    pc.iceGatheringState
                );
        };

        // Log ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            enableLogs &&
                console.log(
                    `ICE connection state for peer ${peerId}:`,
                    pc.iceConnectionState
                );
            if (pc.iceConnectionState === 'failed') {
                enableLogs &&
                    console.log(
                        'ICE connection failed for peer',
                        peerId,
                        'Restarting...'
                    );
                pc.restartIce();
            }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            enableLogs &&
                console.log(
                    stream
                        ?.getTracks()
                        .map((o) => `${peerId}==${o.id}==${o.kind}`),
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
                        meetCollection,
                        meetCode,
                        'candidates',
                        `${userId}-${peerId}`,
                        'collection'
                    ),
                    event.candidate.toJSON()
                );
            }
        };

        pc.onsignalingstatechange = () => {
            enableLogs &&
                console.log(
                    `Signaling state for peer ${peerId}:`,
                    pc.signalingState
                );
        };

        // Listen for ICE candidates from the answering peer
        const unsubscribeCandidates = onSnapshot(
            collection(
                db,
                meetCollection,
                meetCode,
                'candidates',
                `${peerId}-${userId}`,
                'collection'
            ),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    const data = change.doc.data();
                    const pc = peerConnections.get(peerId);
                    enableLogs &&
                        console.log(
                            'adding anscandidates',
                            change.type,
                            peerId
                        );
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

        unsubscribeRefs.current.push(unsubscribeCandidates);
    }

    function startPeerConnection(peerId: string) {
        const pc = new RTCPeerConnection(servers);
        enableLogs && console.log('new pc created for', peerId);
        localPcs.current.push(pc);
        // Store peer connection
        setPeerConnections((prev) => new Map(prev.set(peerId, pc)));

        const localStream = new MediaStream([
            ...(localStreamRef.current.at(0)?.getTracks() ?? []),
            ...(localStreamRef.current.at(1)?.getTracks() ?? []),
        ]);
        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        });
        (async () => {
            await PCFunctionsInit(userId, peerId, pc);
        })();
        pc.onnegotiationneeded = async () => {
            await sendOffer(pc, peerId);
        };

        // Listen for answer
        const unsubscribeAnswers = onSnapshot(
            doc(
                db,
                meetCollection,
                meetCode,
                'answers',
                `${peerId}-${userId}`
            ),
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
    }

    function listenOffers() {
        // Listen for offers
        const unsubscribeOffers = onSnapshot(
            collection(db, meetCollection, meetCode, 'offers', userId, 'collection'),
            (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const peerId = data.fromPeerId;
                        delete data.fromPeerId;
                        enableLogs &&
                            console.log('offer change', change.type, peerId);
                        if (peerId !== userId && userId && peerId) {
                            const pc = new RTCPeerConnection(servers);
                            enableLogs &&
                                console.log('new pc created for', peerId);
                            localPcs.current.push(pc);
                            // Store peer connection
                            setPeerConnections(
                                (prev) => new Map(prev.set(peerId, pc))
                            );

                            const localStream = new MediaStream([
                                ...(localStreamRef.current.at(0)?.getTracks() ??
                                    []),
                                ...(localStreamRef.current.at(1)?.getTracks() ??
                                    []),
                            ]);
                            localStream.getTracks().forEach((track) => {
                                pc.addTrack(track, localStream);
                            });
                            await PCFunctionsInit(userId, peerId, pc);
                            pc.onnegotiationneeded = async () => {
                                await sendAnswer(pc, peerId, data);
                            };
                        }
                    }
                });
            }
        );
        unsubscribeRefs.current.push(unsubscribeOffers);
    }

    return {
        videoStream: localStreamRef.current.at(0),
        audioStream: localStreamRef.current.at(1),
        remoteStreams,
        peerConnections,
    };
}
