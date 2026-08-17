"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTrackingId } from "@/lib/tracking";

export function TrackingIdGenerator() {
  const [id, setId] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function roll() {
    const next = generateTrackingId();
    setId(next);
    setCopied(false);
  }

  async function copy() {
    if (!id) roll();
    const value = id || generateTrackingId();
    setId(value);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function tryTrack() {
    const value = (id || generateTrackingId()).trim().toUpperCase();
    setId(value);
    router.push(`/track/${value}`);
  }

  return (
    <div className="card border border-ocean-200/80 bg-gradient-to-br from-white to-ocean-50 dark:border-ocean-800 dark:from-slate-900 dark:to-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ocean-900 dark:text-ocean-100">Demo tracking ID</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Generate a placeholder container-style ID for testing flows. Register the real voyage in Firebase via the{" "}
            <span className="font-medium text-ocean-700 dark:text-ocean-400">Admin</span> panel so tracking resolves.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={roll} className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-800">
            Generate ID
          </button>
          <button type="button" onClick={copy} className="rounded-lg border border-ocean-300 px-4 py-2 text-sm hover:bg-ocean-50 dark:border-ocean-600 dark:hover:bg-slate-800">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      {id && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-lg dark:border-slate-700 dark:bg-slate-900">
          <span>{id}</span>
          <button type="button" onClick={tryTrack} className="ml-auto text-sm font-medium text-ocean-700 underline hover:no-underline dark:text-ocean-400">
            Try /track/[id]
          </button>
        </div>
      )}
    </div>
  );
}
