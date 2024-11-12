import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';

import {
    onAuthStateChanged as _onAuthStateChanged,
} from 'firebase/auth';

interface userType {
    uid: string;
    email: string;
}

const formatAuthUser = (user: userType) => ({
    uid: user.uid,
    email: user.email,
});

export default function useFirebaseAuth() {
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const authStateChanged = async (authState: userType) => {
        if (!authState) {
            setLoading(false);
            return;
        }
        setLoading(true);
        var formattedUser = formatAuthUser(authState);
        setAuthUser(formattedUser);
        setLoading(false);
    };

    const onAuthStateChanged = (cb) => {
        return _onAuthStateChanged(auth, cb);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(authStateChanged);
        return () => unsubscribe();
    }, []);

    return {
        authUser,
        loading,
    };
}
