"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TRACKING_ID_REGEX } from "@/lib/tracking";

type TrackingSearchFormProps = {
  /** Matches marketing home: stacked field + full-width button */
  variant?: "default" | "stacked";
  /** Anchor `id` for deep links (`/#track-shipment`) */
  anchorId?: string;
  /** Extra Tailwind classes (e.g. home overlap shadow) */
  className?: string;
};

export function TrackingSearchForm({ variant = "stacked", anchorId, className = "" }: TrackingSearchFormProps) {
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const scrollToAnchorIfNeeded = useCallback(() => {
    if (!anchorId || typeof window === "undefined") return;
    requestAnimationFrame(() => {
      if (window.location.hash === `#${anchorId}`) {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [anchorId]);

  useEffect(() => {
    scrollToAnchorIfNeeded();
    if (!anchorId || typeof window === "undefined") return;
    window.addEventListener("hashchange", scrollToAnchorIfNeeded);
    return () => window.removeEventListener("hashchange", scrollToAnchorIfNeeded);
  }, [anchorId, scrollToAnchorIfNeeded]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = trackingId.trim().toUpperCase();
    if (!trimmed) {
      setError("Tracking ID is required.");
      return;
    }
    if (!TRACKING_ID_REGEX.test(trimmed)) {
      setError("Tracking ID format is invalid. Example: MSCU1234567");
      return;
    }
    setError("");
    router.push(`/track/${trimmed}`);
  }

  const isStacked = variant === "stacked";

  return (
    <form
      id={anchorId}
      onSubmit={onSubmit}
      className={`mx-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-900 sm:p-6 ${!isStacked ? "max-w-2xl" : ""} ${className}`}
    >
      <label htmlFor="trackingId" className="block text-left text-base font-bold text-slate-900 dark:text-slate-50">
        Enter tracking number
      </label>
      <div className={`mt-4 gap-3 ${isStacked ? "flex flex-col" : "mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch"}`}>
        <input
          id="trackingId"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="e.g. MSCU1234567"
          className={`w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-marine-700 focus:border-marine-700 focus:ring-2 focus:ring-marine-700/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 ${
            isStacked ? "" : "sm:text-xl"
          }`}
        />
        <button
          type="submit"
          className={`w-full rounded-lg bg-marine-700 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-marine-800 ${
            isStacked ? "" : "shrink-0 sm:w-auto sm:rounded-xl sm:px-8 sm:text-xl"
          }`}
        >
          Track Shipment
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}
