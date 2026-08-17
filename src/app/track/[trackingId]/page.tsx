"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { subscribeShipmentByTrackingId } from "@/lib/shipment";
import type { Shipment } from "@/lib/types";
import { ProgressBar } from "@/components/progress-bar";
import { ShipmentTimeline } from "@/components/shipment-timeline";
import { etaCountdown, formatUtcDateTime } from "@/lib/time";
import { getNextStep } from "@/lib/shipping-status";

const ShipmentMap = dynamic(() => import("@/components/shipment-map").then((m) => m.ShipmentMap), { ssr: false });

function ShipmentDetails({ shipment }: { shipment: Shipment }) {
  const details = useMemo(
    () =>
      [
        ["Tracking ID", shipment.trackingId],
        ["Sender Name", shipment.sender],
        ["Receiver Name", shipment.receiver],
        ["Receiver Address", shipment.receiverAddress],
        ["Destination Country", shipment.destinationCountry],
        ["Origin Port", shipment.originPort],
        ["Destination Port", shipment.destinationPort],
        ["Shipping Line", shipment.shippingLine],
        ["Container Number", shipment.containerNumber],
        ["Vessel Name", shipment.vesselName],
        ["Voyage Number", shipment.voyageNumber],
        ["Cargo Type", shipment.cargo],
        ["Weight", shipment.weight],
        ["Departure Date", shipment.departureDate],
        ["Estimated Arrival Date", shipment.eta],
        ["Current Location", shipment.locationName],
        ["Current Status", shipment.status],
        ["Created At", formatUtcDateTime(shipment.createdAt)],
        ["Last Updated", formatUtcDateTime(shipment.lastUpdated)]
      ] as [string, string][],
    [shipment]
  );

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold">Shipment Info</h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <dt className="text-xs uppercase text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function TrackingResultPage() {
  const params = useParams<{ trackingId: string }>();
  const trackingId = decodeURIComponent(params.trackingId).toUpperCase();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const unsubscribe = subscribeShipmentByTrackingId(
      trackingId,
      (data) => {
        if (!data) {
          setError("No shipment found for this tracking number.");
          setShipment(null);
        } else {
          setError("");
          setShipment(data);
        }
        setLoading(false);
      },
      (code) => {
        setError(code === "unavailable" ? "Live tracking is temporarily offline." : "Unable to fetch tracking details right now.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [trackingId]);

  if (loading) {
    return <p className="py-16 text-center text-slate-600 dark:text-slate-300">Loading shipment details...</p>;
  }

  if (error || !shipment) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h2 className="text-xl font-semibold">Tracking Error</h2>
        <p className="text-red-600">{error || "Shipment not found"}</p>
        <Link href="/#track-shipment" className="inline-block rounded-md bg-marine-700 px-4 py-2 text-white hover:bg-marine-800">
          Back to tracking
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-marine-900 via-marine-700 to-marine-600 px-5 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Live Shipment Summary</p>
          <h3 className="mt-1 text-xl font-bold">{shipment.trackingId}</h3>
          <p className="mt-1 text-sm text-cyan-100">
            {shipment.originPort} → {shipment.destinationPort}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Current</p>
            <p className="mt-1 text-sm font-semibold">{shipment.status}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{shipment.locationName}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Next Step</p>
            <p className="mt-1 text-sm font-semibold">{getNextStep(shipment.status)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Auto-updated from timeline</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">ETA Countdown</p>
            <p className="mt-1 text-sm font-semibold">{etaCountdown(shipment.eta)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Estimated arrival: {shipment.eta}</p>
          </div>
        </div>
      </div>
      <ShipmentDetails shipment={shipment} />
      <div className="card">
        <ProgressBar progress={shipment.progress} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ShipmentTimeline shipment={shipment} />
        <ShipmentMap coordinates={shipment.coordinates} route={shipment.route} locationName={shipment.locationName} />
      </div>
    </section>
  );
}
