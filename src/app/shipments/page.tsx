"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllShipments } from "@/lib/shipment";
import type { Shipment } from "@/lib/types";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllShipments()
      .then((data) => setShipments(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">My Shipments</h2>
      {loading ? (
        <p>Loading shipments...</p>
      ) : shipments.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-300">No shipments available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shipments.map((shipment) => (
            <Link
              key={shipment.id}
              href={`/track/${shipment.trackingId}`}
              className="card transition hover:shadow-md"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">{shipment.trackingId}</p>
              <h3 className="font-semibold">
                {shipment.originPort} → {shipment.destinationPort}
              </h3>
              <p className="text-sm">{shipment.status}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
