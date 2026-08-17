"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ADMIN_EMAIL, auth, ensureAuthPersistence } from "@/lib/auth";
import {
  createSupportMessage,
  getAllSupportMessages,
  replySupportMessage,
  subscribeAllSupportMessages,
  subscribeUserSupportMessages,
  type SupportMessage
} from "@/lib/support";
import { formatUtcDateTime } from "@/lib/time";

export default function SupportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sentDone, setSentDone] = useState(false);
  const [repliedDoneId, setRepliedDoneId] = useState("");
  const [status, setStatus] = useState("");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const [authReady, setAuthReady] = useState(false);

  async function loadMessages(currentUser: User) {
    try {
      if (currentUser.email?.toLowerCase() === ADMIN_EMAIL) {
        setItems(await getAllSupportMessages());
      } else {
        // Fallback initial load before realtime subscription updates.
        setItems([]);
      }
      setStatus("");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setStatus(mapSupportError(code, "Unable to load support inbox."));
    }
  }

  useEffect(() => {
    ensureAuthPersistence().catch(() => null);
    if (!auth) {
      setUser(null);
      setAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) await loadMessages(nextUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const onData = (messages: SupportMessage[]) => {
      setItems(messages);
      setStatus("");
    };
    const onError = (code: string) => setStatus(mapSupportError(code, "Unable to sync support inbox in real time."));

    const unsub =
      user.email?.toLowerCase() === ADMIN_EMAIL
        ? subscribeAllSupportMessages(onData, onError)
        : subscribeUserSupportMessages(user.uid, onData, onError);

    return () => unsub();
  }, [authReady, user]);

  async function submitComplaint(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !newMessage.trim()) return;
    setLoading(true);
    setSentDone(false);
    setStatus("");
    try {
      await createSupportMessage({
        userUid: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || "User",
        message: newMessage.trim(),
        adminReply: "",
        adminEmail: ""
      });
      setNewMessage("");
      await loadMessages(user);
      setStatus("Message sent to support.");
      setSentDone(true);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setStatus(mapSupportError(code, "Could not send message."));
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(id: string) {
    if (!user || !id) return;
    const text = (replyText[id] || "").trim();
    if (!text) return;
    setLoading(true);
    setRepliedDoneId("");
    setStatus("");
    try {
      await replySupportMessage(id, text, user.email || ADMIN_EMAIL);
      await loadMessages(user);
      setReplyText((prev) => ({ ...prev, [id]: "" }));
      setStatus("Reply sent.");
      setRepliedDoneId(id);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setStatus(mapSupportError(code, "Failed to send reply."));
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-marine-700 dark:text-marine-400">
            Help &amp; Support
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">How can we help?</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Browse quick answers below. To open a ticket and message our team, sign in to your Sea Cargo Tracker account.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Message support</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Log in to send a complaint or question. An authorized admin can read and reply in the same thread.
              </p>
            </div>
            <Link
              href="/account?mode=login"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-marine-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-marine-800 sm:w-auto"
            >
              Sign in to contact us
            </Link>
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Track a shipment</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Enter your container ID on the home page to view voyage progress, map, and milestones.
            </p>
            <Link
              href="/#track-shipment"
              className="mt-4 inline-block text-sm font-semibold text-marine-700 hover:underline dark:text-marine-400"
            >
              Go to tracking →
            </Link>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Common questions</h2>
          <ul className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <li>
              <p className="font-medium text-slate-900 dark:text-white">What format is a tracking number?</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Use the standard container-style ID shown on your booking (for example MSCU1234567).
              </p>
            </li>
            <li>
              <p className="font-medium text-slate-900 dark:text-white">Where is my data stored?</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Read our{" "}
                <Link href="/privacy" className="font-semibold text-marine-700 hover:underline dark:text-marine-400">
                  Privacy Policy
                </Link>{" "}
                for collection, use, and retention details.
              </p>
            </li>
            <li>
              <p className="font-medium text-slate-900 dark:text-white">I need operations or billing help.</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                After signing in, use Help and Support from your profile menu to reach the team with full context on your
                account.
              </p>
            </li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="card">
        <h2 className="text-2xl font-bold">{isAdmin ? "Support Inbox (Admin)" : "Help / Support Chat"}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {isAdmin
            ? "Review customer complaints and reply directly."
            : "Send your complaint. Only admin can receive and reply."}
        </p>
      </div>

      {!isAdmin && (
        <form onSubmit={submitComplaint} className="card space-y-3">
          <label className="text-sm font-medium">Your message</label>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={4}
            required
            className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
            placeholder="Describe your issue..."
          />
          <button disabled={loading} className="rounded-md bg-marine-700 px-4 py-2 text-white hover:bg-marine-800 disabled:opacity-60">
            {loading ? "Sending..." : sentDone ? "Sent ✓" : "Send to Support"}
          </button>
        </form>
      )}

      <div className="card space-y-3">
        <h3 className="text-lg font-semibold">{isAdmin ? "Open Conversations" : "Your Conversations"}</h3>
        {items.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No support messages yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">{formatUtcDateTime(item.createdAt)}</p>
                <p className="mt-1 text-sm"><span className="font-semibold">{item.userName}</span> ({item.userEmail})</p>
                <p className="mt-2 text-sm">{item.message}</p>
                {item.adminReply ? (
                  <div className="mt-3 rounded-md bg-emerald-50 p-2 text-sm dark:bg-emerald-950/40">
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">Admin Reply</p>
                    <p>{item.adminReply}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatUtcDateTime(item.adminReplyAt)}</p>
                  </div>
                ) : (
                  isAdmin && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={3}
                        value={replyText[item.id || ""] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [item.id || ""]: e.target.value }))
                        }
                        className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                        placeholder="Type reply..."
                      />
                      <button
                        onClick={() => sendReply(item.id || "")}
                        disabled={loading}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {loading ? "Replying..." : repliedDoneId === (item.id || "") ? "Replied ✓" : "Send Reply"}
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {status && <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p>}
    </section>
  );
}

function mapSupportError(code: string, fallback: string): string {
  switch (code) {
    case "permission-denied":
      return "Support feature is blocked by Firestore rules. Please allow signed-in read/write for support messages.";
    case "failed-precondition":
      return "Support query needs a Firestore index. Create the suggested index from Firebase console and retry.";
    case "unavailable":
      return "Firebase service is temporarily unavailable. Try again shortly.";
    default:
      return fallback;
  }
}
