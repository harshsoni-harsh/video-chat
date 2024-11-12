import Link from "next/link";
import SignOut from "./SignOut";

export default function AuthorizedHeader() {
    return (
        <div className="bg-zinc-800 flex items-center justify-between py-1 px-2 lg:fixed w-full">
            <Link href="/dashboard" className="font-semibold">Video Chat</Link>
            <div className="flex gap-4 items-center">
                <Link className="max-xs:hidden" href="/dashboard">Home</Link>
                <SignOut />
            </div>
        </div>
    )
}