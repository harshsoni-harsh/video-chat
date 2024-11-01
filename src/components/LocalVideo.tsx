import React, { useRef, useEffect } from 'react';

interface LocalVideoProps {
    localVideoRef: React.RefObject<HTMLVideoElement>;
    localStream: MediaStream | null;
    userId: string;
}

const LocalVideo: React.FC<LocalVideoProps> = ({ localVideoRef, localStream, userId }) => {

    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    return (
        <div className="relative">
            <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border-2 border-slate-800 bg-gray-800"
            />
            <div className="absolute bottom-4 left-4">You {userId}</div>
        </div>
    );
};

export default LocalVideo;
