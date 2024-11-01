import React from 'react';

interface RemoteVideoProps {
    peerId: string;
    stream: MediaStream;
}

const RemoteVideo: React.FC<RemoteVideoProps> = ({ peerId, stream }) => {
    return (
        <div className="relative">
            <video
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-slate-800"
                ref={(el) => {
                    if (el) el.srcObject = stream;
                }}
            />
            <div className="absolute bottom-4 left-4">Peer {peerId}</div>
        </div>
    );
};

export default RemoteVideo;
