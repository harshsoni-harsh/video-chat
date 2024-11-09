'use client';

import React, { Usable, use, useEffect, useRef, useState } from 'react';
import LocalVideo from '@/components/LocalVideo';
import Controls from '@/components/Controls';
import RemoteVideo from '@/components/RemoteVideo';
import { useVideoChat } from '@/hooks/useVideoChat';
import { useRouter } from 'next/navigation';

export default function VideoChat({
    params,
}: {
    params: Promise<any>;
}) {
    const [isMicOn, setMicOn] = useState(false);
    const [isVideoOn, setVideoOn] = useState(false);
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
    const {videoStream, audioStream, remoteStreams, peerConnections} = useVideoChat({meetCode, userId, isMicOn, isVideoOn, localVideoRef});

    if (meetCode && userId) {
        const toggleMic = () => setMicOn((prev) => !prev);
        const toggleVideo = () => setVideoOn((prev) => !prev);

        function disconnectCall() {
            videoStream.getTracks().forEach((track) => track.stop());
            audioStream.getTracks().forEach((track) => track.stop());
            peerConnections.forEach((pc) => pc.close());
            router.replace('/');
        }
        const localStream = new MediaStream([
            ...videoStream?.getTracks() ?? [],
            ...audioStream?.getTracks() ?? []
        ]);
    
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
