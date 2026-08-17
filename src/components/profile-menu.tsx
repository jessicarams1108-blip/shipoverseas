"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, ADMIN_EMAIL, ensureAuthPersistence } from "@/lib/auth";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    ensureAuthPersistence().catch(() => null);

    let done = false;
    const fallback = window.setTimeout(() => {
      if (!done) {
        done = true;
        setLoading(false);
      }
    }, 6500);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      window.clearTimeout(fallback);
      done = true;
      setUser(nextUser);
      setLoading(false);
    });
    return () => {
      window.clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  async function logout() {
    if (!auth) return;
    await signOut(auth);
    setOpen(false);
  }

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  if (!auth) {
    return <GuestAuthActions />;
  }

  if (loading) {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />;
  }

  if (!user?.email) {
    return <GuestAuthActions />;
  }

  const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const avatar = user.email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 py-1 shadow-sm transition hover:shadow dark:border-slate-700 dark:bg-slate-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marine-700 text-sm font-semibold text-white">
          {avatar}
        </span>
      </button>

      <div
        role="menu"
        aria-label="Account menu"
        className={`absolute right-0 top-12 z-40 w-[17.5rem] origin-top-right rounded-xl border border-slate-200 bg-white py-2 shadow-xl transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
          open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0"
        }`}
      >
        <p className="border-b border-slate-100 px-4 pb-3 pt-1 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Signed in as
          <span className="mt-1 block truncate font-medium text-slate-800 dark:text-slate-100">{user.email}</span>
        </p>

        <div className="px-1.5 pt-2">
          <MenuLink role="menuitem" href="/" label="Home" onSelect={() => setOpen(false)} />
          <MenuLink role="menuitem" href="/account" label="Account" onSelect={() => setOpen(false)} />
          <MenuLink role="menuitem" href="/#track-shipment" label="Track shipment" onSelect={() => setOpen(false)} />
          <MenuLink role="menuitem" href="/shipments" label="My shipment" onSelect={() => setOpen(false)} />
          <MenuLink role="menuitem" href="/privacy" label="Privacy and Policy" onSelect={() => setOpen(false)} />
          <MenuLink role="menuitem" href="/support" label="Help and Support" onSelect={() => setOpen(false)} />
          {isAdmin && (
            <MenuLink
              role="menuitem"
              href="/admin"
              label="Admin Panel"
              onSelect={() => setOpen(false)}
              highlight
            />
          )}
        </div>

        <div className="my-2 border-t border-slate-100 px-4 dark:border-slate-800" />

        <div className="px-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestAuthActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account?mode=login"
        className="rounded-lg bg-marine-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-marine-800"
      >
        Login
      </Link>
      <Link
        href="/account?mode=signup"
        className="hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:inline-block dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        Signup
      </Link>
    </div>
  );
}

function MenuLink({
  href,
  label,
  onSelect,
  highlight,
  role
}: {
  href: string;
  label: string;
  onSelect: () => void;
  highlight?: boolean;
  role?: string;
}) {
  return (
    <Link
      role={role}
      href={href}
      onClick={onSelect}
      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        highlight
          ? "text-marine-800 hover:bg-marine-50 dark:text-marine-300 dark:hover:bg-marine-950/40"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </Link>
  );
}
