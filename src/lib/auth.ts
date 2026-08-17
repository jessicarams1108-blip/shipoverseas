import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";
import { app } from "@/lib/firebase";

function safeGetAuth(): Auth | null {
  if (!app) return null;
  try {
    return getAuth(app);
  } catch (err) {
    console.warn(
      "[sea-cargo-tracker] Firebase Auth could not start (check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local).",
      err
    );
    return null;
  }
}

/** `null` when Firebase app is missing or Auth rejects the config (e.g. invalid API key). */
export const auth: Auth | null = safeGetAuth();

export const ADMIN_EMAIL = "hardewusi@gmail.com";

let persistenceInitialized = false;

export async function ensureAuthPersistence(): Promise<void> {
  if (!auth) return;
  if (persistenceInitialized) return;
  await setPersistence(auth, browserLocalPersistence);
  persistenceInitialized = true;
}
