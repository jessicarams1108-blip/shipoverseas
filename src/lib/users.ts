import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function upsertUserProfile(input: { uid: string; name: string; email: string }) {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = doc(db, "users", input.uid);
  let createdAtValue: unknown = serverTimestamp();

  try {
    const existing = await getDoc(ref);
    createdAtValue = existing.exists() ? existing.data().createdAt : serverTimestamp();
  } catch {
    // If offline/unavailable, still attempt merge write with fresh timestamp.
    createdAtValue = serverTimestamp();
  }

  await setDoc(
    ref,
    {
      uid: input.uid,
      name: input.name,
      email: input.email,
      createdAt: createdAtValue
    },
    { merge: true }
  );
}

export async function getUserProfile(uid: string) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    // Gracefully degrade when client is offline.
    return null;
  }
}

export async function updateUserSettings(uid: string, settings: Record<string, unknown>) {
  if (!db) throw new Error("Firebase is not configured.");
  await setDoc(
    doc(db, "users", uid),
    {
      settings
    },
    { merge: true }
  );
}

export async function deleteUserProfile(uid: string) {
  if (!db) throw new Error("Firebase is not configured.");
  await deleteDoc(doc(db, "users", uid));
}

export function mapFirebaseAuthError(code: string, fallback: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already in use.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled. Enable it in Firebase Authentication > Sign-in method.";
    case "auth/invalid-api-key":
    case "auth/configuration-not-found":
      return "Firebase configuration is invalid. Update your .env.local with real Firebase project values.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/requires-recent-login":
      return "For security, please log out and log back in, then try this action again.";
    case "permission-denied":
      return "Account created, but Firestore blocked profile save. Update Firestore rules to allow users/{uid} writes for the signed-in user.";
    case "unavailable":
      return "Account created, but Firestore is temporarily unavailable.";
    default:
      return fallback;
  }
}
