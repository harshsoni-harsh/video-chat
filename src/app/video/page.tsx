'use client';

import db from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function Page() {
    const router = useRouter();
    useEffect(() => {
        async function createCall() {
            try {
                const callDoc = await addDoc(collection(db, 'calls'), {
                    createdAt: serverTimestamp()
                });
                router.push(`/video/${callDoc.id}`);
            } catch (err) {
                console.error('Failed to create meeting:', err);
                alert('Failed to create meeting. Please try again.');
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
