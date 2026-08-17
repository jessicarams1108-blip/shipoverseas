"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { createShipment, getAllShipments, updateShipment } from "@/lib/shipment";
import type { Shipment } from "@/lib/types";
import { getStatusProgress, SHIPPING_STATUSES } from "@/lib/shipping-status";
import { auth, ADMIN_EMAIL, ensureAuthPersistence } from "@/lib/auth";

const INITIAL_FORM: Shipment = {
  trackingId: "",
  sender: "",
  receiver: "",
  receiverAddress: "",
  destinationCountry: "",
  originPort: "",
  destinationPort: "",
  shippingLine: "",
  containerNumber: "",
  vesselName: "",
  voyageNumber: "",
  cargo: "",
  weight: "",
  departureDate: "",
  eta: "",
  locationName: "",
  status: "Booking Confirmed",
  progress: 0,
  coordinates: { lat: 0, lng: 0 },
  route: [],
  history: []
};

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState<Shipment>(INITIAL_FORM);

  async function loadShipments() {
    const data = await getAllShipments();
    setShipments(data.sort((a, b) => String(b.trackingId).localeCompare(String(a.trackingId))));
  }

  useEffect(() => {
    if (!auth) {
      router.replace("/");
      return;
    }
    ensureAuthPersistence().catch(() => null);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const allowed = user?.email?.toLowerCase() === ADMIN_EMAIL;
      setIsAdmin(Boolean(allowed));
      setCheckingAccess(false);
      if (allowed) {
        loadShipments().catch(console.error);
      } else {
        router.replace("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const editSelection = useMemo(
    () => shipments.find((item) => item.id === selectedShipmentId) ?? null,
    [selectedShipmentId, shipments]
  );

  useEffect(() => {
    if (!editSelection) return;
    setForm(editSelection);
  }, [editSelection]);

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setStatusMessage("");
    try {
      const payload: Shipment = {
        ...form,
        trackingId: form.trackingId.toUpperCase(),
        progress: form.progress || getStatusProgress(form.status),
        route: form.route.length ? form.route : [form.coordinates],
        history: form.history.length
          ? form.history
          : [{ status: form.status, date: new Date().toISOString().slice(0, 10), locationName: form.locationName }]
      };

      await withTimeout(createShipment(payload), 15000, "Create shipment request timed out.");
      setStatusMessage(`Shipment ${payload.trackingId} created successfully.`);
      setForm(INITIAL_FORM);
      await loadShipments();
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setStatusMessage(mapAdminError(code, "Failed to create shipment."));
    } finally {
      setCreating(false);
    }
  }

  async function submitUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.id) {
      setStatusMessage("Select a shipment from the table first.");
      return;
    }
    setUpdating(true);
    setStatusMessage("");
    try {
      const nextHistory = [
        ...(form.history || []),
        { status: form.status, date: new Date().toISOString().slice(0, 10), locationName: form.locationName }
      ];
      await withTimeout(
        updateShipment(form.id, {
          ...form,
          progress: getStatusProgress(form.status),
          history: nextHistory
        }),
        15000,
        "Update shipment request timed out."
      );
      setStatusMessage(`Shipment ${form.trackingId} updated.`);
      await loadShipments();
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setStatusMessage(mapAdminError(code, "Failed to update shipment."));
    } finally {
      setUpdating(false);
    }
  }

  function parseRoute(routeRaw: string) {
    const points = routeRaw
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [lat, lng] = part.split(",").map((value) => Number(value.trim()));
        return { lat, lng };
      })
      .filter((point) => !Number.isNaN(point.lat) && !Number.isNaN(point.lng));
    setForm((prev) => ({ ...prev, route: points }));
  }

  if (!isAdmin) {
    if (checkingAccess) return <p className="py-10 text-center">Checking access...</p>;
    return (
      <section className="mx-auto max-w-lg">
        <div className="card space-y-4 text-center">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">You do not have permission to view the admin panel.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Panel</h2>

      <form onSubmit={submitCreate} className="card space-y-4">
        <h3 className="text-lg font-semibold">Create New Shipment</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            required
            pattern="[A-Za-z]{4}[0-9]{7}"
            placeholder="Tracking ID (e.g. MSCU1234567)"
            value={form.trackingId}
            onChange={(e) => setForm({ ...form, trackingId: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Sender Name"
            value={form.sender}
            onChange={(e) => setForm({ ...form, sender: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Receiver Name"
            value={form.receiver}
            onChange={(e) => setForm({ ...form, receiver: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Receiver Address"
            value={form.receiverAddress}
            onChange={(e) => setForm({ ...form, receiverAddress: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Destination Country"
            value={form.destinationCountry}
            onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Origin Port"
            value={form.originPort}
            onChange={(e) => setForm({ ...form, originPort: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Destination Port"
            value={form.destinationPort}
            onChange={(e) => setForm({ ...form, destinationPort: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Shipping Line"
            value={form.shippingLine}
            onChange={(e) => setForm({ ...form, shippingLine: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Container Number"
            value={form.containerNumber}
            onChange={(e) => setForm({ ...form, containerNumber: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Vessel Name"
            value={form.vesselName}
            onChange={(e) => setForm({ ...form, vesselName: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Voyage Number"
            value={form.voyageNumber}
            onChange={(e) => setForm({ ...form, voyageNumber: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Cargo Type"
            value={form.cargo}
            onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Weight"
            value={form.weight}
            onChange={(e) => setForm({ ...form, weight: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            type="date"
            required
            value={form.departureDate}
            onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            type="date"
            required
            value={form.eta}
            onChange={(e) => setForm({ ...form, eta: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            placeholder="Current Location Name"
            value={form.locationName}
            onChange={(e) => setForm({ ...form, locationName: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <select
            required
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value, progress: getStatusProgress(e.target.value) })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          >
            {SHIPPING_STATUSES.map((item) => (
              <option key={item} value={item} className="text-slate-900">
                {item}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            required
            placeholder="Current Latitude"
            value={form.coordinates.lat}
            onChange={(e) => setForm({ ...form, coordinates: { ...form.coordinates, lat: Number(e.target.value) } })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            type="number"
            step="any"
            required
            placeholder="Current Longitude"
            value={form.coordinates.lng}
            onChange={(e) => setForm({ ...form, coordinates: { ...form.coordinates, lng: Number(e.target.value) } })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
        </div>
        <textarea
          placeholder="Route points as lat,lng; lat,lng; lat,lng"
          onChange={(e) => parseRoute(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
        />
        <button type="submit" disabled={creating} className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-60">
          {creating ? "Creating..." : "Create Shipment"}
        </button>
      </form>

      <form onSubmit={submitUpdate} className="card space-y-4">
        <h3 className="text-lg font-semibold">Update Selected Shipment</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            readOnly
            value={form.trackingId}
            placeholder="Selected tracking ID"
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
          <select
            required
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value, progress: getStatusProgress(e.target.value) })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          >
            {SHIPPING_STATUSES.map((item) => (
              <option key={item} value={item} className="text-slate-900">
                {item}
              </option>
            ))}
          </select>
          <input
            type="date"
            required
            value={form.eta}
            onChange={(e) => setForm({ ...form, eta: e.target.value })}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            required
            value={form.locationName}
            onChange={(e) => setForm({ ...form, locationName: e.target.value })}
            placeholder="Current location name"
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            type="number"
            step="any"
            required
            value={form.coordinates.lat}
            onChange={(e) => setForm({ ...form, coordinates: { ...form.coordinates, lat: Number(e.target.value) } })}
            placeholder="Latitude"
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <input
            type="number"
            step="any"
            required
            value={form.coordinates.lng}
            onChange={(e) => setForm({ ...form, coordinates: { ...form.coordinates, lng: Number(e.target.value) } })}
            placeholder="Longitude"
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
        </div>
        <button type="submit" disabled={updating} className="rounded-md bg-ocean-700 px-4 py-2 text-white disabled:opacity-60">
          {updating ? "Updating..." : "Update Shipment"}
        </button>
      </form>

      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">All Shipments</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2">Tracking ID</th>
                <th className="px-3 py-2">Receiver</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Progress</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedShipmentId(item.id ?? "")}
                  className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                    selectedShipmentId === item.id ? "bg-ocean-50 dark:bg-slate-800" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{item.trackingId}</td>
                  <td className="px-3 py-2">{item.receiver}</td>
                  <td className="px-3 py-2">
                    {item.originPort} → {item.destinationPort}
                  </td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{item.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {statusMessage && (
        <p className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          {statusMessage}
        </p>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Mock notification: once a shipment is updated, you can trigger an email integration later from a Cloud Function.
      </p>
    </section>
  );
}

function mapAdminError(code: string, fallback: string): string {
  switch (code) {
    case "permission-denied":
      return "Create/update blocked by Firestore rules. Allow admin writes for shipments.";
    case "unavailable":
      return "Network or Firebase service unavailable. Check internet and retry.";
    case "deadline-exceeded":
      return "Request timed out. Please retry.";
    default:
      return fallback;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error(timeoutMessage) as Error & { code: string };
        err.code = "deadline-exceeded";
        reject(err);
      }, timeoutMs);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
