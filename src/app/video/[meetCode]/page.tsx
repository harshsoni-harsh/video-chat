'use client';

import React, { Usable, use, useEffect, useRef, useState } from 'react';
import LocalVideo from '@/components/LocalVideo';
import Controls from '@/components/Controls';
import RemoteVideo from '@/components/RemoteVideo';
import { useVideoChat } from '@/hooks/useVideoChat';
import useMediaStream from '@/hooks/useMediaStream';
import { useRouter } from 'next/navigation';

export default function VideoChat({
    params,
}: {
    params: Usable<any>;
}) {
    const [isMicOn, setMicOn] = useState(true);
    const [isVideoOn, setVideoOn] = useState(true);
    const [userId, setUserId] = useState<string>('');
    const { meetCode } = use(params);
    const router = useRouter();
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const userId = `user-${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        setUserId(userId);
        console.warn('New user ID:', userId);
    }, []);
    const {remoteStreams, peerConnections} = useVideoChat({meetCode, userId, isVideoOn, isMicOn});
    const {localStream} = useMediaStream(isMicOn, isVideoOn, peerConnections, localVideoRef);
    console.log(remoteStreams, peerConnections, localStream)

    if (meetCode && userId) {
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
                    <LocalVideo {...{localVideoRef, localStream, userId}} />
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
    } else {
        return <div>Loading...</div>;
    }
    
}
