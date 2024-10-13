'use client'

import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_APP_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_APP_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_APP_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_APP_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is missing required environment variables.');
}

const firebase_app = !getApps().length
    ? initializeApp(firebaseConfig)
    : getApps()[0];

const db = getFirestore(firebase_app);

export default db;