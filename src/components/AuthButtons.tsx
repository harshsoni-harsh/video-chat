'use client';

import { auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authErrorCodes } from '@/lib/errorCodes';

const AuthButtons = () => {
    const router = useRouter();

    const googleAuth = async () => {
        let result;
        const provider = new GoogleAuthProvider();
        try {
            result = await signInWithPopup(auth, provider);
            router.push('/dashboard');
        } catch (e) {
            if (e && typeof e === 'object' && 'code' in e)
                switch (e.code) {
                    case authErrorCodes.userDisabled:
                        alert("Your account is disabled. Please contact support.");
                        break;
                    default:
                        console.log(e);
                        alert("There's some error occurred in server. Please try again.");
                }
        }
    };

    return (
        <button type="submit" onClick={googleAuth} className="mt-4 bg-white text-black rounded px-4 py-2 flex gap-2 items-center ">
            <Image src="/google-logo.png" height="15" width="15" alt="google logo" />
            <span>Continue with Google</span>
        </button>
    );
};

export default AuthButtons;