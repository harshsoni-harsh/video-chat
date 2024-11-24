'use client'

import { User } from "firebase/auth";
import { Dispatch, SetStateAction, createContext, useContext } from "react";

type AuthContextType = {
    user: User | null;
    setUser: Dispatch<SetStateAction<User | null>>;
    login: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    signUp: (fullName: string, mail: string, password: string) => Promise<any>;
    getUser: () => User | null;
    isLoading: boolean;
};

const login = async (mail: string, password: string) => { }
const signOut = async () => { }
const signUp = async () => { }
const getUser = () => null

export const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => { }, login, signOut, signUp, getUser, isLoading: true });

export const useAuth = () => {
    return useContext(AuthContext);
}
