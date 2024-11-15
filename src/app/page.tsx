'use client';

import Header from '@/components/Header';
import MeetJoinBox from '@/components/MeetJoinBox';
import { useRouter } from 'next/navigation';

export default function Page() {
    const router = useRouter();
    
    function joinCall(meetCode: string) {
        if (meetCode) router.push(`/video/${meetCode}`);
    }
    return (
        <div className="flex flex-col gap-8 lg:gap-12 h-screen justify-center items-center [&_*]:outline-none">
            <Header />
            <MeetJoinBox heading='Video Conf over WebRTC' button1Text='Create Call' button2Text='Join Call' link='/video' joinMeet={joinCall} />
        </div>
    );
}
