import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function Page() {
    const sendMail = async (e: FormData) => {
        'use server'
        const mail = e.get('email') as string;
        await sendPasswordResetEmail(auth, mail);
    }
    return (
        <div className="grow flex justify-center items-center p-2">
            <form action={sendMail} className="p-2 rounded bg-zinc-900 flex flex-col gap-4 items-center justify-center text-center">
                <input
                    className="outline-none rounded p-1 px-2 bg-transparent border border-zinc-700"
                    required type="email" name="email" id="email" placeholder="john.doe@gmail.com"
                />
                <button type="submit" className="p-2 py-1 bg-zinc-200 text-black rounded w-full">Send password reset link</button>
            </form>
        </div>
    )
}