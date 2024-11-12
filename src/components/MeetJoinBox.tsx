import Link from "next/link";
import { useState } from "react";

export default function MeetJoinBox({heading, button1Text, button2Text, link, joinMeet} : {heading: string, button1Text: string, button2Text: string, link: string, joinMeet: (meetCode: string) => void}) {
    const [meetCode, setMeetCode] = useState('');
    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMeetCode(e.target.value);
    }
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && meetCode) joinMeet(meetCode);
    }
    function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        joinMeet(meetCode);
    }
    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <div className="flex flex-col gap-3 border-2 rounded-xl p-2 border-gray-400 max-xs:w-11/12 max-sm:w-5/6">
                <p className="text-xl font-bold">
                    {heading}
                </p>
                <Link
                    href={link}
                    className="text-center w-full bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg"
                >
                    {button1Text}
                </Link>
                <form onClick={handleFormSubmit} className="grid grid-cols-3 max-sm:grid-cols-2 max-sm:pt-2 gap-2 sflex-wrap">
                    <input
                        value={meetCode}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="col-span-2 rounded-lg text-black px-2 p-1 w-full"
                        placeholder='Session Code' 
                        required
                    />
                    <button
                        type="submit"
                        className="col-span-1 max-sm:col-span-2 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-lg"
                    >
                        {button2Text}
                    </button>
                </form>
            </div>
        </div>
    )
}