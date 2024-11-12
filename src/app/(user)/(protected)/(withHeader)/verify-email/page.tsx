'use client'
import { useAuth } from "@/context/AuthUserContext"
import { auth } from "@/lib/firebase"
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from "firebase/auth"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect } from "react"

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();

  const verifyEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user?.email) {
      try {
        await sendSignInLinkToEmail(auth, user.email, { handleCodeInApp: true, url: `${process.env.NEXT_FIREBASE_VERIFICATION_EMAIL}` })
      } catch (e) {
        // console.log(JSON.stringify(e));
      }
    }
  }
  if (user?.emailVerified) {
    router.replace('/dashboard');
  }
  let email: string | null = "";
  if (typeof window !== 'undefined') {
    if (user?.email) {
      window.localStorage.setItem("email", user?.email);
    }
    email = window.localStorage.getItem("email");
  }
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.href;
      const run = async () => {
        try {
          const res = await signInWithEmailLink(auth, `${email}`, path);
          router.replace('/dashboard');
        } catch (e) {
          // console.log(JSON.stringify(e));
        }
        if (isSignInWithEmailLink(auth, path)) {
          run();
        }
      }
    }
  }, [email, router]);

  return (
    <div className="grow flex justify-center items-center p-2">
      <form onSubmit={verifyEmail} className="p-2 rounded bg-zinc-900 flex gap-4 flex-wrap items-center justify-center text-center">
        <p>Please verify your email.</p>
        <button type="submit" className="p-2 py-1 bg-zinc-200 text-black rounded">Send link</button>
      </form>
    </div>
  )
}