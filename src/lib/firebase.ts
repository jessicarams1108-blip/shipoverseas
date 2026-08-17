import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

export const SEA_CARGO_FIREBASE_APP_NAME = "sea-cargo-tracker-web";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !String(firebaseConfig.apiKey).includes("demo") &&
    !String(firebaseConfig.projectId).includes("demo-project")
);

function resolveApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  try {
    const existing = getApps().find((a) => a.name === SEA_CARGO_FIREBASE_APP_NAME);
    if (existing) return existing;
    return initializeApp(firebaseConfig, SEA_CARGO_FIREBASE_APP_NAME);
  } catch (err) {
    console.warn("[sea-cargo-tracker] Firebase failed to initialize. Check NEXT_PUBLIC_FIREBASE_* in .env.local.", err);
    return null;
  }
}

/** `null` when env is missing or Firebase throws during boot (site still loads without auth/Firestore). */
export const app: FirebaseApp | null = resolveApp();

function safeGetFirestore(): Firestore | null {
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch (err) {
    console.warn("[sea-cargo-tracker] Firestore could not initialize. Check Firebase env values.", err);
    return null;
  }
}

export const db: Firestore | null = safeGetFirestore();
