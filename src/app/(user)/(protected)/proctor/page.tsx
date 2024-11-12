'use client';

import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function Page() {
    const router = useRouter();
    useEffect(() => {
        // Create proctor
        const userId = `user-${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        localStorage.setItem('userId', userId);

        // Create call
        async function createCall() {
            try {
                const callDoc = await addDoc(collection(db, 'proctor'), {
                    createdAt: serverTimestamp(),
                    proctorId: userId
                });
                if (document?.hasFocus()) {
                    navigator.clipboard?.writeText(callDoc.id);
                }    
                router.push(`/proctor/${callDoc.id}`);
            } catch (err) {
                console.error('Failed to create meeting:', err);
                alert('Failed to create meeting. Please try again.');
                router.replace('/');
            }
        }
        if (router)
            createCall();
    }, [router]);
    return (
        <div className="flex flex-col min-h-screen justify-center items-center">
            <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 180, scale: 1 }}
                transition={{
                    repeat: Infinity,
                }}
                className="size-20 bg-gray-200"
            />
        </div>
    );
}