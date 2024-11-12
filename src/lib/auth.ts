import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);

        if (!result || !result.user) {
            throw new Error('Google sign in failed');
        }
        return result.user.uid;
    } catch (error) {
        console.error('Error signing in with Google', error);
    }
}

export async function signOutWithGoogle() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out with Google', error);
    }
}