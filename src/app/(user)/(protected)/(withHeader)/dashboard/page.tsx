'use client';
import MeetJoinBox from '@/components/MeetJoinBox';
import { useAuth } from '@/context/AuthUserContext';

import { useRouter } from 'next/navigation';

export default function Page() {
    const { user } = useAuth();
    const router = useRouter();
    if (!user?.displayName) {
        return <></>;
    }

    function joinVideoChat(meetCode: string) {
        if (meetCode) router.push(`/video-chat/${meetCode}`);
    }
    function joinProctor(meetCode: string) {
        if (meetCode) router.push(`/proctor/${meetCode}`);
    }
    return (
        <div className="flex flex-col gap-8 lg:gap-12 grow justify-center items-center [&_*]:outline-none">
            <MeetJoinBox heading={'Video Conf over WebRTC'} button1Text='Create Call' button2Text='Join Call' link='/video-chat' joinMeet={joinVideoChat} />
            <MeetJoinBox heading={'Remote Proctoring via WebRTC'} button1Text='Create Session' button2Text='Connect' link='/proctor' joinMeet={joinProctor} />
        </div>
    );
}
