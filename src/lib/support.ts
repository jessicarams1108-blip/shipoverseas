import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
  updateDoc,
  where,
  doc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Sea Cargo Tracker support inbox — SwiftTrack lives in swifttrack_support in the other repo. */
const SUPPORT_COLLECTION = "supportMessages";

export type SupportMessage = {
  id?: string;
  userUid: string;
  userEmail: string;
  userName: string;
  message: string;
  status: "open" | "replied";
  createdAt?: unknown;
  adminReply?: string;
  adminReplyAt?: unknown;
  adminEmail?: string;
};

export async function createSupportMessage(input: Omit<SupportMessage, "id" | "status" | "createdAt">) {
  if (!db) throw new Error("Firebase is not configured.");
  await addDoc(collection(db, SUPPORT_COLLECTION), {
    ...input,
    status: "open",
    createdAt: serverTimestamp()
  });
}

export async function getUserSupportMessages(userUid: string): Promise<SupportMessage[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, SUPPORT_COLLECTION), where("userUid", "==", userUid)));
  const rows = snap.docs.map((item) => ({ id: item.id, ...(item.data() as SupportMessage) }));
  return rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export async function getAllSupportMessages(): Promise<SupportMessage[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, SUPPORT_COLLECTION), orderBy("createdAt", "desc")));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as SupportMessage) }));
}

export async function replySupportMessage(id: string, reply: string, adminEmail: string) {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, SUPPORT_COLLECTION, id), {
    adminReply: reply,
    adminReplyAt: serverTimestamp(),
    adminEmail,
    status: "replied"
  });
}

export function subscribeUserSupportMessages(
  userUid: string,
  onData: (messages: SupportMessage[]) => void,
  onError: (errorCode: string) => void
): Unsubscribe {
  if (!db) {
    onError("unavailable");
    return () => {};
  }
  return onSnapshot(
    query(collection(db, SUPPORT_COLLECTION), where("userUid", "==", userUid)),
    (snap) => {
      const rows = snap.docs.map((item) => ({ id: item.id, ...(item.data() as SupportMessage) }));
      onData(rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)));
    },
    (error) => onError(getFirebaseErrorCode(error))
  );
}

export function subscribeAllSupportMessages(
  onData: (messages: SupportMessage[]) => void,
  onError: (errorCode: string) => void
): Unsubscribe {
  if (!db) {
    onError("unavailable");
    return () => {};
  }
  return onSnapshot(
    query(collection(db, SUPPORT_COLLECTION), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map((item) => ({ id: item.id, ...(item.data() as SupportMessage) }))),
    (error) => onError(getFirebaseErrorCode(error))
  );
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getFirebaseErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code || "");
  }
  return "unknown";
}
