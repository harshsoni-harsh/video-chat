import Link from "next/link";

export default function Header() {
    return (
        <div className="bg-zinc-800 flex items-center justify-between py-2 px-2 max-h-fit absolute top-0 w-full">
            <Link href="/" className="font-semibold">Video Chat</Link>
            <div className="flex gap-4 items-center">
                <Link href="/login" className="px-2 py-1 border border-white rounded-md">Login</Link>
                <Link href="/register" className="px-2 py-1 bg-zinc-100 text-zinc-950 rounded-md">Register</Link>
            </div>
        </div>
    )
}