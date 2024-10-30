'use client';

import {
    addDoc,
    collection, deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Airplay,
    Mic,
    MicOff,
    PhoneOff,
    Settings,
    Upload,
    Users,
    Video,
    VideoOff,
} from 'lucide-react';
import db from '@/lib/firebase';
import { useRouter } from 'next/navigation';

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
    params: { meetCode },
}: {
    params: { meetCode: string };
}) {
    const [isMicOn, setMicOn] = useState(true);
    const [isVideoOn, setVideoOn] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
    const [userId] = useState<string>(`user-${Math.random().toString(36).substring(2, 9)}`);
    const debouncedTimeoutRef = useRef(null); // For setupLocalMedia function

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();

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

    useEffect(() => {
        console.log(userId, peerConnections);
        peerConnections.forEach((pc, peerId) => {
            console.log(peerId);
            pc.onconnectionstatechange = () => {
                console.log(`Connection state for peer ${peerId}:`, pc.connectionState);
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    console.log('Closing peer connection:', peerId);
                    pc.close();
                    peerConnections.delete(peerId);
                } else if (pc.connectionState === 'closed') {
                    // console.log('Removing closed peer connection:', peerId);
                    // peerConnections.delete(peerId);
                    // remoteStreams.delete(peerId);
                }
            };
        })
    }, [peerConnections])

    useEffect(() => {
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
            localStream?.getTracks().forEach(track => track.stop());
            peerConnections.forEach(pc => pc.close());
        };
    }, [meetCode]);

    async function initializeMeet() {
        const meetDoc = await getDoc(doc(collection(db, 'calls'), meetCode));

        if (!meetDoc.exists()) {
            alert('Invalid meeting code');
            router.replace('/');
            return;
        }

        await setupLocalMedia();

        // Add participant to the meeting
        await setDoc(doc(db, 'calls', meetCode, 'participants', userId), {
            userId,
            joinedAt: serverTimestamp(),
        });

        // Listen for new participants
        onSnapshot(collection(db, 'calls', meetCode, 'participants'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const peerId = change.doc.id;
                if (change.type === 'added' && peerId !== userId) {
                    if (!peerConnections.has(peerId)) {
                        await createPeerConnection(peerId);
                    }
                }
            });
        });

        // Listen for offers
        onSnapshot(collection(db, 'calls', meetCode, 'offers'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const peerId = change.doc.id;
                    
                    if (peerId !== userId) {
                        await handleOffer(peerId, data);
                    }
                }
            });
        });
    }

    useEffect(() => {
        // Clear any previous timeout to debounce
        if (debouncedTimeoutRef.current) {
            localStream?.getAudioTracks()?.forEach(track => track.stop());
            localStream?.getVideoTracks()?.forEach(track => track.stop());
            clearTimeout(debouncedTimeoutRef.current);
        }
        debouncedTimeoutRef.current = setTimeout(() => {
            if (!isVideoOn) {
                localVideoRef.current.srcObject = null;
                localStream?.getVideoTracks()?.forEach(track => track.stop());
            }
            if (!isMicOn) {
                localStream?.getAudioTracks()?.forEach(track => track.stop());
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
                    stream.getTracks().forEach(track => {
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
    
    async function handleOffer(peerId: string, offerData: any) {
        const pc = new RTCPeerConnection(servers);

        // Store peer connection
        setPeerConnections(prev => new Map(prev.set(peerId, pc)));

        // Add local tracks to peer connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        } else {
            const stream = await setupLocalMedia();
            stream?.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(event.streams?.map(o => o.id), 'from handleOffer');
            const stream = event.streams[0];
            setRemoteStreams(prev => new Map(prev.set(peerId, stream)));
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await setDoc(doc(db, 'calls', meetCode, 'candidates', `${userId}:${peerId}`),
                    event.candidate.toJSON()
                );
            }
        };

        // Add connection state change logging
        pc.onconnectionstatechange = () => {
            console.log(`Connection state for peer ${peerId}:`, pc.connectionState);
        };

        pc.onsignalingstatechange = () => {
            console.log(`Signaling state for peer ${peerId}:`, pc.signalingState);
        };

        // Set remote description (offer)
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));

        // Create and set local description (answer)
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer
        await setDoc(doc(db, 'calls', meetCode, 'answers', peerId), {
            type: answer.type,
            sdp: answer.sdp,
        });

        // Listen for ICE candidates from the offering peer
        onSnapshot(collection(db, 'calls', meetCode, 'candidates'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const docId =  change.doc.id;
                const [fromPeerId, toPeerId] = docId.split(':');
                
                if (toPeerId !== userId) return;

                const pc = peerConnections[peerId];
                if (change.type === 'added' && pc && pc.signalingState !== 'closed') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    await pc.addIceCandidate(candidate);
                } else {
                    // peerConnections.delete(peerId);
                    // remoteStreams.delete(peerId);
                    // console.log('Removing closed peer connection:', peerId);
                }
            });
        });
    }

    async function createPeerConnection(peerId: string) {
        const pc = new RTCPeerConnection(servers);

        // Store peer connection
        setPeerConnections(prev => new Map(prev.set(peerId, pc)));

        // Log ICE gathering state changes
        pc.onicegatheringstatechange = () => {
            console.log(`ICE gathering state for peer ${peerId}:`, pc.iceGatheringState);
        };

        // Log ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.log(`ICE connection state for peer ${peerId}:`, pc.iceConnectionState);
        };
        
        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(event.streams?.map(o => o.id), 'from createPeerConnection')
            const stream = event.streams[0];
            setRemoteStreams(prev => new Map(prev.set(peerId, stream)));
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await setDoc(doc(db, 'calls', meetCode, 'candidates', `${userId}:${peerId}`),
                event.candidate.toJSON()
            );
        }};

        // Add local tracks to peer connection
        if (localStream) {
            const pcSenders = pc.getSenders();
            const addTrackIds = pcSenders.map(sender => sender.track?.id);
            localStream?.getTracks().forEach(track => {
                if (track.id && !addTrackIds.includes(track.id)) {
                    pc.addTrack(track, localStream);
                }
            });
        } else {
            const stream = await setupLocalMedia();
            const pcSenders = pc.getSenders();
            const addTrackIds = pcSenders.map(sender => sender.track?.id);
            stream?.getTracks().forEach(track => {
                if (track.id && !addTrackIds.includes(track.id)) {
                    pc.addTrack(track, stream);
                }
            });
        }

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await setDoc(doc(db, 'calls', meetCode, 'offers', userId), {
            sdp: offer.sdp,
            type: offer.type,
        });

        // Listen for answer
        onSnapshot(collection(db, 'calls', meetCode, 'answers'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const fromUserId = change.doc.id;
                    if (fromUserId === peerId && !pc.currentRemoteDescription) {
                        await pc.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit));
                    }
                }
            });
        });
        
        // Listen for ICE candidates from the answering peer
        onSnapshot(collection(db, 'calls', meetCode, 'candidates'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                const docId =  change.doc.id;
                const [fromPeerId, toPeerId] = docId.split(':');
                
                if (toPeerId !== userId) return;

                const pc = peerConnections[peerId];
                if (change.type === 'added' && pc && pc.signalingState !== 'closed') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    await pc.addIceCandidate(candidate);
                } else {
                    // peerConnections.delete(peerId);
                    // remoteStreams.delete(peerId);
                    // console.log('Removing closed peer connection:', peerId);
                }
            });
        });

        return pc;
    }

    function disconnectCall() {
        localStream?.getTracks().forEach(track => track.stop());
        peerConnections.forEach(pc => pc.close());
        router.replace('/');
    }

    return (
        <div className="flex flex-col h-screen items-center w-screen">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 w-full">
                {/* Local video */}
                <div className="relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full rounded-lg border-2 border-slate-800 -scale-x-100 bg-gray-800"
                    />
                    <div className="absolute bottom-4 left-4">You</div>
                </div>

                {/* Remote videos */}
                {Array.from(remoteStreams).map(([peerId, stream]) => (
                    <div key={peerId} className="relative">
                        <video
                            autoPlay
                            playsInline
                            className="w-full rounded-lg border-2 border-slate-800 -scale-x-100"
                            ref={el => {
                                if (el) el.srcObject = stream;
                            }}
                        />
                        <div className="absolute bottom-4 left-4">Peer {peerId}</div>
                    </div>
                ))}
            </div>
            <div className="fixed bottom-3 flex flex-wrap justify-center gap-2 rounded-xl p-3 bg-slate-800">
                {isMicOn ? (
                    <Mic
                        className="rounded-lg bg-blue-500 p-2 size-10"
                        onClick={() => setMicOn(false)}
                    />
                ) : (
                    <MicOff
                        className="rounded-lg bg-red-500 p-2 size-10"
                        onClick={() => setMicOn(true)}
                    />
                )}
                {isVideoOn ? (
                    <Video
                        className="rounded-lg bg-blue-500 p-2 size-10"
                        onClick={() => setVideoOn(false)}
                    />
                ) : (
                    <VideoOff
                        className="rounded-lg bg-red-500 p-2 size-10"
                        onClick={() => setVideoOn(true)}
                    />
                )}
                <button
                    disabled={!meetCode}
                    className="rounded-lg bg-blue-500 disabled:bg-gray-500 p-2"
                >
                    <Upload className="size-6" />
                </button>
                <button
                    disabled={!meetCode}
                    className="rounded-lg bg-blue-500 disabled:bg-gray-500 p-2"
                >
                    <Airplay className="size-6" />
                </button>
                <button
                    disabled={!meetCode}
                    className="rounded-lg bg-blue-500 disabled:bg-gray-500 p-2"
                >
                    <Users className="size-6" />
                </button>
                <Settings className="rounded-lg bg-blue-500 p-2 size-10" />
                <button
                    disabled={!meetCode}
                    className="rounded-lg bg-blue-500 disabled:bg-gray-500 p-2"
                    onClick={disconnectCall}
                >
                    <PhoneOff className="size-6" />
                </button>
            </div>
            {isDialogOpen && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg">
                    <p>Meeting Code: {meetCode}</p>
                    <button onClick={() => setDialogOpen(false)}>Close</button>
                </div>
            )}
        </div>
    );
}
