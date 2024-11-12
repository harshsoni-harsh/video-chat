'use client';

import React, { use, useRef, useState } from 'react';
import LocalVideo from '@/components/LocalVideo';
import Controls from '@/components/Controls';
import RemoteVideo from '@/components/RemoteVideo';
import { useVideoChat } from '@/hooks/useVideoChat';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthUserContext';

export default function ProctorSession({
    params,
}: {
    params: Promise<any>;
}) {
    const [isMicOn, setMicOn] = useState(false);
    const [isVideoOn, setVideoOn] = useState(false);
    const { meetCode } = use(params);
    const router = useRouter();
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const { user } = useAuth();
    
    if (!user) {
        return <></>;
    }

    const userId = `${user.uid}`;
    const userName = `${user.displayName}`;

    const {videoStream, audioStream, remoteStreams, peerConnections} = useVideoChat({meetCode, userId, isMicOn, isVideoOn, localVideoRef, isProctor: true});

    if (meetCode && userId) {
        const toggleMic = () => setMicOn((prev) => !prev);
        const toggleVideo = () => setVideoOn((prev) => !prev);

        function disconnectCall() {
            videoStream.getTracks().forEach((track) => track.stop());
            audioStream.getTracks().forEach((track) => track.stop());
            peerConnections.forEach((pc) => pc.close());
            router.replace('/dashboard');
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
