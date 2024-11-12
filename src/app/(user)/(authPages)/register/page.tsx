"use client";

import AuthButtons from "@/components/AuthButtons";
import { useAuth } from "@/context/AuthUserContext";
import { authErrorCodes } from "@/lib/errorCodes";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function Page() {
    const { signUp } = useAuth();
    const [emailErr, setEmailErr] = useState("");
    const [passwordErr, setPasswordErr] = useState("");
    const [name, setName] = useState("");
    const [mail, setMail] = useState("");
    const [password, setPassword] = useState("");
    const handleForm = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setEmailErr("");
        setPasswordErr("");
        signUp(name, mail, password).then(res => {
            const errorCode = res?.code;
            if (errorCode)
                switch (errorCode) {
                    case authErrorCodes.emailAlreadyInUse:
                        setEmailErr("Email already exists");
                        break;
                    case authErrorCodes.weakPassword:
                        setPasswordErr("Weak password");
                        break;
                    case authErrorCodes.networkRequestFailed:
                        alert("Network error detected. Please try again after some time.");
                        break;
                    default:
                        alert("Some error occurred. Please try again.");
                }
        })
    };
    return (
        <div className="grid place-items-center grow bg-zinc-950 text-zinc-200">
            <div className="flex flex-col p-4 rounded border border-zinc-700 bg-zinc-900">
                <p className="mb-2 text-2xl font-bold">Sign up</p>
                {/* <form onSubmit={handleForm} className="flex flex-col gap-2">
                    <label htmlFor="name">
                        <p className="font-semibold">Full name</p>
                        <input
                            onChange={e => setName(e.target.value)}
                            className="outline-none rounded p-1 px-2 bg-transparent border border-zinc-700"
                            required
                            type="text"
                            name="name"
                            id="name"
                            placeholder="John Doe"
                        />
                    </label>
                    <label htmlFor="email">
                        <p className="font-semibold">Email</p>
                        <input
                            onChange={e => setMail(e.target.value)}
                            className="outline-none rounded p-1 px-2 bg-transparent border border-zinc-700"
                            required
                            type="email"
                            name="email"
                            id="email"
                            placeholder="john.doe@gmail.com"
                        />
                        <p className="text-red-600">{emailErr}</p>
                    </label>
                    <label htmlFor="password">
                        <p className="font-semibold">Password</p>
                        <input
                            onChange={e => setPassword(e.target.value)}
                            className="outline-none rounded p-1 px-2 bg-transparent border border-zinc-700"
                            required
                            type="password"
                            name="password"
                            id="password"
                            placeholder="password"
                        />
                        <p className="text-red-600">{passwordErr}</p>
                    </label>
                    <button
                        className="text-black font-semibold bg-white border rounded w-fit px-2 py-1 mt-2 self-center"
                        type="submit"
                    >
                        Sign up
                    </button>
                </form>
                <p className="text-center mt-4 font-bold">OR</p> */}
                <AuthButtons />
                <p className="mt-4">
                    Have an account?{" "}
                    <Link className="text-sky-500" href="/login">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
}