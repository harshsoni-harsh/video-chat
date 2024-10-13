'use client';

import db from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Page() {
    const router = useRouter();
    addDoc(collection(db, 'calls'), {}).then((callDoc) => {
        router.push(`/video/${callDoc.id}`);
    });
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
