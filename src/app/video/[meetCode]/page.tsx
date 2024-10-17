'use client';

import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import React from 'react';
import { useEffect, useRef, useState } from 'react';

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
} from 'react-feather';
import db from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { servers } from '@/lib/webrtc';

export default function Home({
    params: { meetCode },
}: {
    params: { meetCode: string };
}) {
    const [isMicOn, setMicOn] = useState(false);
    const [isVideoOn, setVideoOn] = useState(false);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream>(null);
    const pc = useRef<RTCPeerConnection>(new RTCPeerConnection(servers));
    const webCamVideo = useRef<HTMLVideoElement>(null);
    const remoteVideo = useRef<HTMLVideoElement>(null);
    const router = useRouter();

    if (pc.current) console.log(pc.current);
    pc.current.onsignalingstatechange = () => {
        console.log('ICE connection state change: ', pc.current);
    };

    useEffect(() => {
        if (meetCode) {
            checkIfDocExists();
        }
        return () => {
            pc.current?.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetCode]);

    async function checkIfDocExists() {
        const callDoc = await getDoc(doc(collection(db, "calls"), meetCode));
        if (!callDoc.exists()) {
            alert('Invalid Call');
            router.replace('/');
        } else {
            // Check if the call has an offer
            const callData = callDoc.data();
            if (!callData.offer) {
                // No offer yet - we should create one
                await createCall();
            } else {
                // Call exists with offer - join it
                await joinCall();
            }
        }
    }

    async function turnStreamOn() {
        if (!pc.current) {
            console.warn('Reinitializing peer connection due to invalid state.');
            pc.current = new RTCPeerConnection(servers);
        }

        const lstream = await navigator.mediaDevices.getUserMedia({
            video: isVideoOn,
            audio: isMicOn,
        });
        if (!localStream) {
            console.count('lstreams')
            setLocalStream(lstream);
        } else {
            const prevAudioTracks = localStream.getAudioTracks();
            const prevVideoTracks = localStream.getVideoTracks();
            if (!isMicOn) {
                prevAudioTracks.forEach((track) =>
                    localStream.removeTrack(track)
                );
            } else if (!prevAudioTracks.length) {
                const streamTracks = lstream.getAudioTracks();
                streamTracks.forEach((track) => localStream.addTrack(track));
            }
            if (!isVideoOn) {
                prevVideoTracks.forEach((track) =>
                    localStream.removeTrack(track)
                );
            } else if (!prevVideoTracks.length) {
                const streamTracks = lstream.getVideoTracks();
                streamTracks.forEach((track) => localStream.addTrack(track));
            }
        }

        const rstream = new MediaStream();
        setRemoteStream(rstream);

        // Push tracks from local stream to peer connection
        lstream?.getTracks().forEach((track) => {
            pc.current.addTrack(track, lstream);
        });

        // Pull tracks from remote stream, add to video stream
        pc.current.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                rstream.addTrack(track);
            });
        };

        try {
            if (lstream.active) {
                webCamVideo.current.srcObject = lstream;
                await webCamVideo.current.play();
            }
        } catch (e) {
            console.error('Error playing webcam video', e);
        }
        try {
            if (rstream.active) {
                remoteVideo.current.srcObject = rstream;
                await remoteVideo.current.play();
            }
        } catch (e) {
            console.error('Error playing remote stream', e);
        }
    }

    useEffect(() => {
        const audioTracks = localStream?.getAudioTracks();
        const videoTracks = localStream?.getVideoTracks();
        if (!isVideoOn) {
            videoTracks?.forEach((track) => track.stop());
            webCamVideo.current.srcObject = null;
        }
        if (!isMicOn) {
            audioTracks?.forEach((track) => track.stop());
        }
        if (isMicOn || isVideoOn) {
            turnStreamOn();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVideoOn, isMicOn, localStream]);

    async function createCall() {
        if (meetCode) {
            setDialogOpen(true);
        }
        console.log('createCall');
        if (pc.current.signalingState === 'closed') {
            console.warn('Reinitializing peer connection due to closed state.');
            pc.current = new RTCPeerConnection(servers);
        }

        const callDoc = doc(collection(db, 'calls'), meetCode);

        // Reference Firestore collections for signaling
        const offerCandidates = collection(
            db,
            'calls',
            meetCode,
            'offerCandidates'
        );
        const answerCandidates = collection(
            db,
            'calls',
            meetCode,
            'answerCandidates'
        );

        // Get candidates for caller, save to db
        pc.current.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(offerCandidates, event.candidate.toJSON());
                console.log('icecandid',event.candidate.toJSON())
            }
        };

        // Create offer
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);
        console.log('Local description set:', pc.current.localDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await setDoc(callDoc, { offer });
        console.log('added offer:',{...callDoc, ...{offer}});
        // Listen for remote answer
        const unsub = onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!pc.current.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(
                    data.answer
                );
                console.log('new remote answer:',answerDescription, data.answer);
                pc.current.setRemoteDescription(answerDescription);
            }
        });
        setDialogOpen(true);

        // When answered, add candidate to peer connection
        const unsubscribe = onSnapshot(query(answerCandidates), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.current.addIceCandidate(candidate);
                }
            });
        });
        return () => {
            pc.current?.close();
            unsubscribe();
            unsub();
        };
    }
    function Dialog() {
        if (!isDialogOpen) return null;
        return (
            <div className="select-text p-4 bg-gray-200/90 text-gray-800 border-2 rounded-lg border-gray-400 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <p>Meet code</p>
                <p>{meetCode}</p>
                <button
                    onClick={() => setDialogOpen(false)}
                    className="mt-4 bg-red-500 rounded-lg px-2 py-1 text-gray-200"
                >
                    Close
                </button>
            </div>
        );
    }

    const joinCall = async () => {
        if (!meetCode) return;
        if (!pc.current) return;

        if (pc.current.signalingState === 'closed') {
            console.warn('Reinitializing peer connection due to closed state.');
            pc.current = new RTCPeerConnection(servers);
        }

        const callDoc = await getDoc(doc(collection(db, 'calls'), meetCode));
        const callData = callDoc.data();
        console.log(callData);

        const offerCandidates = collection(
            db,
            'calls',
            meetCode,
            'offerCandidates'
        );
        const answerCandidates = collection(
            db,
            'calls',
            meetCode,
            'answerCandidates'
        );

        pc.current.onicecandidate = async (event) => {
            console.log('new ice candidate:',event.candidate.toJSON());
            if (event.candidate) {
                await addDoc(answerCandidates, event.candidate.toJSON());
            }
        };

        // Set up ontrack handler to receive remote stream
        pc.current.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
            if (remoteVideo.current) {
                remoteVideo.current.srcObject = remoteStream;
            }
        };

        const offerDescription = callData.offer;
        
        await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));
        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await updateDoc(doc(collection(db, 'calls'), meetCode), { answer });

        onSnapshot(query(offerCandidates), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    pc.current.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // if (remoteStream?.active) {
        //     remoteVideo.current.srcObject = remoteStream;
        //     remoteVideo.current.play();
        // }

        // Log connection state changes
        pc.current.onconnectionstatechange = () => {
            console.log("Connection state:", pc.current.connectionState);
        };

        // Log signaling state changes
        pc.current.onsignalingstatechange = () => {
            console.log("Signaling state:", pc.current.signalingState);
        };
    };

    function RenderVideos() {
        return (
            <div className="grid grid-cols-1 gap-4 max-md:mb-40 md:py-20 size-full place-items-center content-center">
                <div className="flex flex-col items-center gap-2">
                    <video
                        autoPlay
                        ref={webCamVideo}
                        controls={false}
                        playsInline
                        className="border-2 border-slate-800 rounded-lg -scale-x-100"
                    />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <video
                        autoPlay
                        ref={remoteVideo}
                        controls={false}
                        playsInline
                        className="border-2 border-slate-800 rounded-lg -scale-x-100"
                    />
                </div>
            </div>
        );
    }

    function disconnectCall() {
        remoteVideo.current = null;
        pc.current?.close();
        router.replace('/');
    }

    return (
        <div className="flex h-screen flex-col justify-center items-center p-2 select-none">
            {RenderVideos()}
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
            <Dialog />
        </div>
    );
}
