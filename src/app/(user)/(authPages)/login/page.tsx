"use client";

import AuthButtons from "@/components/AuthButtons";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { authErrorCodes } from "@/lib/errorCodes"
import { useAuth } from "@/context/AuthUserContext";

export default function Page() {
  const { login } = useAuth();
  const [err, setErr] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const handleForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    login(mail, password).then((res) => {
      const errorCode = res?.code;
      if (errorCode)
        switch (errorCode) {
          case authErrorCodes.invalidCredentials:
            setErr("Invalid credentials");
            break;
          case authErrorCodes.networkRequestFailed:
            alert("Network error detected. Please try again after some time.");
            break;
          case authErrorCodes.userDisabled:
            alert("Your account is disabled. Please contact support.");
            break;
          default:
            console.log(errorCode)
            alert("Some error occurred. Please try again.");
        }
    });
  };
  return (
    <div className="grid place-items-center grow bg-zinc-950 text-zinc-200">
      <div className="flex flex-col p-4 rounded border border-zinc-700 bg-zinc-900">
        <p className="mb-2 text-2xl font-bold">Login</p>
        {/* <form onSubmit={handleForm} className="flex flex-col gap-2">
          <label htmlFor="email">
            <p className="font-semibold">Email</p>
            <input
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              className="outline-none rounded p-1 px-2 bg-transparent border border-zinc-700"
              required
              type="email"
              name="email"
              id="email"
              placeholder="john.doe@gmail.com"
            />
          </label>
          <label htmlFor="password">
            <p className="font-semibold">Password</p>
            <input
              onChange={(e) => setPassword(e.target.value)}
              className="outline-none rounded p-1 px-2 bg-transparent border border-zinc-700"
              required
              type="password"
              name="password"
              id="password"
              placeholder="password"
            />
          </label>
          <p className="text-red-600">{err}</p>
          <Link href="/forgot-password" className="text-sky-500 text-sm w-fit">
            Forgot Password?
          </Link>
          <button
            className="text-black font-semibold bg-white border rounded w-fit px-2 py-1 mt-2 self-center"
            type="submit"
          >
            Login
          </button>
        </form>
        <p className="text-center mt-4 font-bold">OR</p> */}
        <AuthButtons />
        <p className="mt-4">
          No account yet?{" "}
          <Link className="text-sky-500" href="/register">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}