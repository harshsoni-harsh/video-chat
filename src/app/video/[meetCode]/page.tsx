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
import React, { useEffect, useRef, useState } from 'react';
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
};

export default function VideoChat({
    params: { meetCode },
}: {
    params: { meetCode: string };
}) {
    const [isMicOn, setMicOn] = useState(false);
    const [isVideoOn, setVideoOn] = useState(false);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
    const [userId] = useState<string>(`user-${Math.random().toString(36).substring(2, 9)}`);
    const debouncedTimeoutRef = useRef(null); // For setupLocalMedia function

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (meetCode) {
            initializeMeet();
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

        // Add participant to the meeting
        await setDoc(doc(collection(db, 'calls', meetCode, 'participants'), userId), {
            userId,
            joinedAt: serverTimestamp(),
        });

        // Listen for new participants
        onSnapshot(collection(db, 'calls', meetCode, 'participants'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' && change.doc.id !== userId) {
                    const peerId = change.doc.id;
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
                    const peerId = data.fromUserId;
                    console.log('from offers', data);
                    
                    if (peerId !== userId) {
                        await handleOffer(peerId, data);
                    }
                }
            });
        });

        // Initialize local media
        if (isVideoOn || isMicOn) {
            await setupLocalMedia();
        }
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
            peerConnections.forEach(pc => {
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });
            });
        } catch (err) {
            console.error('Error accessing media devices:', err);
        }
    }

    async function handleOffer(peerId: string, offerData: any) {
        const pc = new RTCPeerConnection(servers);

        // Add local tracks
        localStream?.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            setRemoteStreams(prev => new Map(prev.set(peerId, stream)));
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(collection(db, 'calls', meetCode, 'candidates', peerId),
                    event.candidate.toJSON()
                );
            }
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
            fromUserId: userId
        });

        // Store peer connection
        setPeerConnections(prev => new Map(prev.set(peerId, pc)));

        // Listen for ICE candidates from the offering peer
        onSnapshot(collection(db, 'calls', meetCode, 'candidates', peerId), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    await pc.addIceCandidate(candidate);
                }
            });
        });
    }

    async function createPeerConnection(peerId: string) {
        const pc = new RTCPeerConnection(servers);

        // Add local tracks to peer connection
        localStream?.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            setRemoteStreams(prev => new Map(prev.set(peerId, stream)));
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(collection(db, 'calls', meetCode, 'candidates', peerId),
                    event.candidate.toJSON()
                );
            }
        };

        // Store peer connection
        setPeerConnections(prev => new Map(prev.set(peerId, pc)));

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await setDoc(doc(db, 'calls', meetCode, 'offers', userId), {
            sdp: offer.sdp,
            type: offer.type,
            fromUserId: userId,
        });

        console.log(offer)

        // Listen for answer
        onSnapshot(collection(db, 'calls', meetCode, 'answers'), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.fromUserId === peerId && !pc.currentRemoteDescription) {
                        await pc.setRemoteDescription(new RTCSessionDescription(data as { type: RTCSdpType, sdp: string }));
                    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full">
                {/* Local video */}
                <div className="relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full rounded-lg border-2 border-slate-800 -scale-x-100"
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
