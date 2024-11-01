import { useEffect, useRef, useState } from 'react';

const useMediaStream = (isMicOn: boolean, isVideoOn: boolean, peerConnections: Map<string, RTCPeerConnection>, localVideoRef: React.RefObject<HTMLVideoElement>) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const debouncedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (debouncedTimeoutRef.current) {
            localStream?.getAudioTracks().forEach((track) => track.stop());
            localStream?.getVideoTracks().forEach((track) => track.stop());
            clearTimeout(debouncedTimeoutRef.current);
        }

        debouncedTimeoutRef.current = setTimeout(() => {
            setupLocalMedia();
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
            peerConnections.forEach((pc) => {
                if (pc && pc.signalingState !== 'closed') {
                    stream.getTracks().forEach((track) => {
                        pc.addTrack(track, stream);
                    });
                }
            });
            return stream;
        } catch (err) {
            console.error('Error accessing media devices:', err);
            return null;
        }
    }

    return { localStream };
};

export default useMediaStream;