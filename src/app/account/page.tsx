"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { ADMIN_EMAIL, auth, ensureAuthPersistence } from "@/lib/auth";
import { mapFirebaseAuthError, upsertUserProfile, getUserProfile, deleteUserProfile } from "@/lib/users";
import { isFirebaseConfigured } from "@/lib/firebase";
import { TRACKING_ID_REGEX } from "@/lib/tracking";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("Not available");
  const [profileEmail, setProfileEmail] = useState("Not available");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const modeParam = new URLSearchParams(window.location.search).get("mode");
    if (modeParam === "login" || modeParam === "signup") setMode(modeParam);
  }, []);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }
    ensureAuthPersistence().catch(() => {
      setMessage({ type: "error", text: "Unable to initialize persistent session." });
    });
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser?.uid) {
        // Fill from Auth immediately so first paint has real values.
        const authEmail = nextUser.email || "Not available";
        const authFallbackName = authEmail.includes("@") ? authEmail.split("@")[0] : "User";
        setProfileName(nextUser.displayName || authFallbackName);
        setProfileEmail(authEmail);

        // Then enrich with Firestore profile if available.
        const doc = await getUserProfile(nextUser.uid);
        if (doc) {
          const resolvedEmail = String(doc.email || authEmail);
          const fallbackName = resolvedEmail.includes("@") ? resolvedEmail.split("@")[0] : "User";
          setProfileName(String(doc.name || nextUser.displayName || fallbackName));
          setProfileEmail(resolvedEmail);
        } else {
          setMessage((prev) => prev ?? { type: "error", text: "Offline mode: showing account info from authentication cache." });
        }
      } else {
        setProfileName("Not available");
        setProfileEmail("Not available");
      }
    });
    return () => unsubscribe();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setMessage({ type: "error", text: "Firebase is not configured. Replace demo values in .env.local and restart dev server." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await upsertUserProfile({
        uid: result.user.uid,
        name: result.user.displayName || name || result.user.email?.split("@")[0] || "User",
        email: result.user.email || email.trim()
      });
      setMessage({ type: "success", text: "Login successful." });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setMessage({ type: "error", text: mapFirebaseAuthError(code, "Unable to login right now.") });
    } finally {
      setLoading(false);
    }
  }

  async function register(event: React.FormEvent) {
    event.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setMessage({ type: "error", text: "Firebase is not configured. Replace demo values in .env.local and restart dev server." });
      return;
    }
    if (!name.trim()) {
      setMessage({ type: "error", text: "Name is required." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: name.trim() });
      await upsertUserProfile({
        uid: result.user.uid,
        name: name.trim(),
        email: result.user.email || email.trim()
      });
      setMessage({ type: "success", text: "Account created successfully." });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setMessage({ type: "error", text: mapFirebaseAuthError(code, "Could not create account.") });
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!auth?.currentUser?.email) return;
    setLoading(true);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setMessage({ type: "success", text: "Password reset email sent. Follow the link to change your password." });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setMessage({ type: "error", text: mapFirebaseAuthError(code, "Unable to start password reset.") });
    } finally {
      setLoading(false);
    }
  }

  async function removeAccount() {
    if (!auth?.currentUser) return;
    if (deleteConfirm !== "DELETE") {
      setMessage({ type: "error", text: "Type DELETE to confirm account deletion." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await deleteUserProfile(auth.currentUser.uid);
      await deleteUser(auth.currentUser);
      setMessage({ type: "success", text: "Account deleted." });
      router.push("/");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setMessage({ type: "error", text: mapFirebaseAuthError(code, "Unable to delete account.") });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
    setMessage({ type: "success", text: "Logged out." });
  }

  function goToTracking(event: React.FormEvent) {
    event.preventDefault();
    const normalized = trackingId.trim().toUpperCase();
    if (!TRACKING_ID_REGEX.test(normalized)) {
      setMessage({ type: "error", text: "Enter a valid Tracking ID, e.g. MSCU1234567." });
      return;
    }
    router.push(`/track/${normalized}`);
  }

  if (!auth) {
    return (
      <section className="mx-auto max-w-2xl space-y-5">
        <div className="card space-y-3 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100">Sign-in unavailable</h2>
          <p className="text-sm text-amber-900/90 dark:text-amber-100/85">
            Firebase is not wired up (missing{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/80">NEXT_PUBLIC_FIREBASE_*</code> env
            variables or startup failed). Add a valid <span className="font-mono">.env.local</span> file, restart{" "}
            <span className="font-mono">npm run dev</span>, then reload this page.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div className="card animate-[fadeIn_.35s_ease] space-y-4">
        <h2 className="text-xl font-semibold">Account</h2>
        {user?.email ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">Signed in as {user.email}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Role: {user.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "user"}
            </p>

            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-medium">Account Details</p>
              <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                <p className="text-sm font-medium">{profileName}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                <p className="text-sm font-medium">{profileEmail}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-medium">Security</p>
              <button onClick={changePassword} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 disabled:opacity-60">
                Change Password
              </button>
            </div>

            <form onSubmit={goToTracking} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-medium">Track Shipment</p>
              <input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="MSCU1234567"
                className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              />
              <button className="rounded-md bg-ocean-700 px-4 py-2 text-sm text-white hover:bg-ocean-900">
                Track
              </button>
            </form>

            <div className="space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
              <p className="text-sm font-medium text-red-600">Delete Account</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Type DELETE to confirm permanent account removal.</p>
              <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="w-full rounded-md border border-red-300 bg-transparent px-3 py-2 text-sm dark:border-red-800" />
              <button onClick={removeAccount} disabled={loading} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60">
                Delete Account
              </button>
            </div>

            <button onClick={logout} className="rounded-md bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600">
              Logout
            </button>
          </>
        ) : (
          <form onSubmit={mode === "login" ? login : register} className="space-y-3">
            <div className="flex gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button type="button" onClick={() => setMode("login")} className={`w-1/2 rounded-md px-3 py-2 text-sm ${mode === "login" ? "bg-white shadow dark:bg-slate-700" : ""}`}>
                Login
              </button>
              <button type="button" onClick={() => setMode("signup")} className={`w-1/2 rounded-md px-3 py-2 text-sm ${mode === "signup" ? "bg-white shadow dark:bg-slate-700" : ""}`}>
                Sign Up
              </button>
            </div>
            {mode === "signup" && (
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" />
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" />
            </div>
            <button disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-ocean-700 px-4 py-2 text-white transition hover:bg-ocean-900 disabled:opacity-60">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        )}
        {message && <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>{message.text}</p>}
      </div>
    </section>
  );
}
