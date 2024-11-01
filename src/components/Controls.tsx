import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface ControlsProps {
    isMicOn: boolean;
    isVideoOn: boolean;
    toggleMic: () => void;
    toggleVideo: () => void;
    disconnectCall: () => void;
}

const Controls: React.FC<ControlsProps> = ({ isMicOn, isVideoOn, toggleMic, toggleVideo, disconnectCall }) => {
    return (
        <div className="opacity-30 hover:opacity-100 transition-opacity duration-300 fixed bottom-3 flex flex-wrap justify-center gap-2 rounded-xl p-3 bg-slate-800">
            {isMicOn ? (
                <Mic className="rounded-lg bg-blue-500 p-2 size-10" onClick={toggleMic} />
            ) : (
                <MicOff className="rounded-lg bg-red-500 p-2 size-10" onClick={toggleMic} />
            )}
            {isVideoOn ? (
                <Video className="rounded-lg bg-blue-500 p-2 size-10" onClick={toggleVideo} />
            ) : (
                <VideoOff className="rounded-lg bg-red-500 p-2 size-10" onClick={toggleVideo} />
            )}
            <button className="rounded-lg bg-blue-500 p-2" onClick={disconnectCall}>
                <PhoneOff className="size-6" />
            </button>
        </div>
    );
};

export default Controls;
