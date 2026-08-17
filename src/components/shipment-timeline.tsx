import type { Shipment } from "@/lib/types";
import { SHIPPING_STATUSES } from "@/lib/shipping-status";

const ICONS: Record<string, string> = {
  "Booking Confirmed": "📝",
  "Container Picked Up": "🚛",
  "At Origin Warehouse": "🏬",
  "Loaded at Origin Port": "🏗️",
  "Departed Origin Port": "⚓",
  "At Sea": "🌊",
  "Mid-Ocean Transit": "🚢",
  "Near Destination Port": "🧭",
  "Arrived at Destination Port": "🏁",
  "Customs Clearance": "🛃",
  "Out for Delivery": "📦",
  Delivered: "✅"
};

const STATUS_COLOR: Record<string, string> = {
  "Booking Confirmed": "bg-slate-400",
  "Container Picked Up": "bg-slate-500",
  "At Origin Warehouse": "bg-zinc-500",
  "Loaded at Origin Port": "bg-blue-500",
  "Departed Origin Port": "bg-blue-500",
  "At Sea": "bg-sky-500",
  "Mid-Ocean Transit": "bg-cyan-600",
  "Near Destination Port": "bg-indigo-500",
  "Arrived at Destination Port": "bg-violet-500",
  "Customs Clearance": "bg-amber-500",
  "Out for Delivery": "bg-orange-500",
  Delivered: "bg-emerald-500"
};

type ShipmentTimelineProps = {
  shipment: Shipment;
};

export function ShipmentTimeline({ shipment }: ShipmentTimelineProps) {
  const currentIndex = SHIPPING_STATUSES.indexOf(shipment.status as (typeof SHIPPING_STATUSES)[number]);

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold">Status Timeline</h3>
      <ol className="space-y-3">
        {SHIPPING_STATUSES.map((step, index) => {
          const active =
            index <= currentIndex || shipment.progress >= Math.round(((index + 1) / SHIPPING_STATUSES.length) * 100);
          const current = shipment.status === step;
          return (
            <li
              key={step}
              className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                current ? "border-ocean-500 bg-ocean-50 dark:border-ocean-500 dark:bg-slate-800" : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="text-base">{ICONS[step] ?? "•"}</span>
              <span className={`h-3 w-3 rounded-full ${active ? STATUS_COLOR[step] : "bg-slate-300 dark:bg-slate-600"}`} />
              <span className={`text-sm ${active ? "font-semibold" : "text-slate-500 dark:text-slate-400"}`}>{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
