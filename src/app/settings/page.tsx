"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, ensureAuthPersistence } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getUserProfile, updateUserSettings } from "@/lib/users";

type AppSettings = {
  shipmentAlerts: boolean;
  emailNotifications: boolean;
  marketingEmails: boolean;
  darkMode: boolean;
  compactMode: boolean;
  language: string;
  timezone: string;
  currency: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  shipmentAlerts: true,
  emailNotifications: true,
  marketingEmails: false,
  darkMode: false,
  compactMode: false,
  language: "English",
  timezone: "UTC",
  currency: "USD"
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ensureAuthPersistence().catch(() => null);
    if (!auth) {
      setUser(null);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) return;
      try {
        const profile = await getUserProfile(nextUser.uid);
        const merged = { ...DEFAULT_SETTINGS, ...(profile?.settings || {}) } as AppSettings;
        setSettings(merged);
        document.documentElement.classList.toggle("dark", Boolean(merged.darkMode));
      } catch {
        setSettings(DEFAULT_SETTINGS);
        setMessage("You are offline. Showing default settings until connection returns.");
      }
    });
    return () => unsubscribe();
  }, []);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      setMessage("Please login first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await updateUserSettings(user.uid, settings);
      document.documentElement.classList.toggle("dark", Boolean(settings.darkMode));
      setMessage("Settings saved.");
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  }

  if (!auth || !isFirebaseConfigured) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="card space-y-2 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100">Settings unavailable</h2>
          <p className="text-sm text-amber-900/90 dark:text-amber-100/85">
            Add valid Firebase credentials to <span className="font-mono">.env.local</span> (<span className="font-mono">NEXT_PUBLIC_FIREBASE_*</span>
            ), restart the dev server, then return here.
          </p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="card space-y-3">
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Please log in to manage your settings.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <form onSubmit={saveSettings} className="card space-y-5">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Customize notification, appearance, and regional preferences.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Toggle label="Shipment Alerts" checked={settings.shipmentAlerts} onChange={(value) => setSettings((prev) => ({ ...prev, shipmentAlerts: value }))} />
          <Toggle label="Email Notifications" checked={settings.emailNotifications} onChange={(value) => setSettings((prev) => ({ ...prev, emailNotifications: value }))} />
          <Toggle label="Marketing Emails" checked={settings.marketingEmails} onChange={(value) => setSettings((prev) => ({ ...prev, marketingEmails: value }))} />
          <Toggle label="Dark Mode" checked={settings.darkMode} onChange={(value) => setSettings((prev) => ({ ...prev, darkMode: value }))} />
          <Toggle label="Compact Interface" checked={settings.compactMode} onChange={(value) => setSettings((prev) => ({ ...prev, compactMode: value }))} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select label="Language" value={settings.language} options={["English", "French", "Spanish"]} onChange={(value) => setSettings((prev) => ({ ...prev, language: value }))} />
          <Select label="Timezone" value={settings.timezone} options={["UTC", "America/Los_Angeles", "Europe/London"]} onChange={(value) => setSettings((prev) => ({ ...prev, timezone: value }))} />
          <Select label="Currency" value={settings.currency} options={["USD", "EUR", "GBP"]} onChange={(value) => setSettings((prev) => ({ ...prev, currency: value }))} />
        </div>

        <button disabled={loading} className="rounded-md bg-ocean-700 px-4 py-2 text-white hover:bg-ocean-900 disabled:opacity-60">
          {loading ? "Saving..." : "Save Settings"}
        </button>
        {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      </form>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-sm">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700">
        {options.map((item) => (
          <option key={item} value={item} className="text-slate-900">
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
