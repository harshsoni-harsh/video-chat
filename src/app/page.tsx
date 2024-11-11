'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Page() {
    const [meetCode, setMeetCode] = useState('');
    const router = useRouter();
    
    function joinCall() {
        if (meetCode) router.push(`/video/${meetCode}`);
    }
    function joinProctor() {
        if (meetCode) router.push(`/proctor/${meetCode}`);
    }
    return (
        <div className="flex flex-col gap-8 lg:gap-12 h-screen justify-center items-center [&_*]:outline-none">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3 border-2 rounded-xl p-2 border-gray-400">
                    <p className="text-xl font-bold">Video Conf over WebRTC</p>
                    <Link href={'/video'} className="text-center w-full bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg">
                        Create Call
                    </Link>
                    <div className="flex gap-2">
                        <input
                            value={meetCode}
                            onChange={(e) => setMeetCode(e.target.value)}
                            className="rounded-lg text-black px-2"
                        />
                        <button
                            onClick={joinCall}
                            className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg"
                        >
                            Join Call
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3 border-2 rounded-xl p-2 border-gray-400">
                    <p className="text-xl font-bold">Remote Proctoring via WebRTC</p>
                    <Link href={'/proctor'} className="text-center w-full bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg">
                        Create Session
                    </Link>
                    <div className="flex gap-2">
                        <input
                            value={meetCode}
                            onChange={(e) => setMeetCode(e.target.value)}
                            className="rounded-lg text-black px-2"
                        />
                        <button
                            onClick={joinProctor}
                            className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg"
                        >
                            Connect as a joinee
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
