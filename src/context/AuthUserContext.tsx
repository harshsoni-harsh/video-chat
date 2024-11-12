'use client'

import { Dispatch, SetStateAction, createContext, useContext, useEffect, useState } from "react";
import { auth, firebase_app } from "@/lib/firebase";
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

type AuthContextType = {
    user: User | null;
    setUser: Dispatch<SetStateAction<User | null>>;
    login: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    signUp: (fullName: string, mail: string, password: string) => Promise<any>;
    getUser: () => User | null;
};

const login = async (mail: string, password: string) => { }
const signOut = async () => { }
const signUp = async () => { }
const getUser = () => null

const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => { }, login, signOut, signUp, getUser });


export const useAuth = () => {
    return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const path = usePathname();

    const login = async (mail: string, password: string) => {
        return await signInWithEmailAndPassword(auth, mail, password).then((res) => {
            setUser(auth.currentUser);
            return res
        }).catch(err => err)
    }
    const signOut = async () => {
        return await auth.signOut();
    }
    const signUp = async (fullName: string, email: string, password: string) => {
        return await createUserWithEmailAndPassword(auth, email, password).then(res => {
            if (auth.currentUser) {
                updateProfile(auth.currentUser, { displayName: fullName });
            }
            auth.onAuthStateChanged(currentUser => {
                setUser(currentUser);
            });
            return res
        }).catch(err => err)
    }
    const getUser = () => {
        return auth.currentUser
    }

    useEffect(() => {
        const appCheck = initializeAppCheck(firebase_app, {
            provider: new ReCaptchaV3Provider(`${process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_KEY}`),
            // Optional argument. If true, the SDK automatically refreshes App Check tokens as needed.
            isTokenAutoRefreshEnabled: true
        });
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(currentUser => {
            setUser(currentUser);
        })
        if (!user) {
            if ((path === "/login" || path === "/register" || path === "/forgot-password")) { }
            else if (!(path.startsWith('/video/') || path === '/video' || path === '/')) router.push('/login');
        } else {
            if (user.emailVerified) {
                if ((path === "/login" || path === "/register" || path === "/forgot-password"))
                    router.push("/dashboard");
            } else {
                router.push("/verify-email");
            }
        }
        return () => unsubscribe();
    }, [path, user, router]);
    const value = {
        user, setUser, login, signOut, signUp, getUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}