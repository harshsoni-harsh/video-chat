'use client'

import { auth } from "@/lib/firebase"
import { Button } from "./ui/Button"

export default function SignOut() {
    const logOut = async () => {
        await auth.signOut();
    }
    return (
        <Button onClick={logOut} className="bg-zinc-700 h-fit w-fit">Sign out</Button>
    )
}