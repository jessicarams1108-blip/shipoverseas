import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  type Unsubscribe,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Shipment, ShipmentHistoryItem } from "@/lib/types";
import { getStatusProgress } from "@/lib/shipping-status";

const SHIPMENTS = "shipments";

export async function getShipmentByTrackingId(trackingId: string): Promise<Shipment | null> {
  if (!db) return null;
  const q = query(collection(db, SHIPMENTS), where("trackingId", "==", trackingId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const item = snap.docs[0];
  return normalizeShipment({ id: item.id, ...(item.data() as Record<string, unknown>) });
}

export async function createShipment(data: Shipment): Promise<string> {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, SHIPMENTS), {
    ...data,
    trackingId: data.trackingId.toUpperCase(),
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp()
  });
  return ref.id;
}

export async function updateShipment(id: string, patch: Partial<Shipment>): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, SHIPMENTS, id), {
    ...patch,
    lastUpdated: serverTimestamp()
  });
}

export async function getShipmentByDocId(id: string): Promise<Shipment | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, SHIPMENTS, id));
  if (!snap.exists()) return null;
  return normalizeShipment({ id: snap.id, ...(snap.data() as Record<string, unknown>) });
}

export async function getAllShipments(): Promise<Shipment[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, SHIPMENTS));
  return snap.docs.map((item) => normalizeShipment({ id: item.id, ...(item.data() as Record<string, unknown>) }));
}

export function subscribeShipmentByTrackingId(
  trackingId: string,
  onData: (shipment: Shipment | null) => void,
  onError: (code: string) => void
): Unsubscribe {
  if (!db) {
    onError("unavailable");
    return () => {};
  }
  const q = query(collection(db, SHIPMENTS), where("trackingId", "==", trackingId));
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onData(null);
        return;
      }
      const item = snap.docs[0];
      onData(normalizeShipment({ id: item.id, ...(item.data() as Record<string, unknown>) }));
    },
    (error) => onError(getFirebaseErrorCode(error))
  );
}

function normalizeShipment(raw: Shipment | (Record<string, unknown> & { id?: string })): Shipment {
  const record = raw as Record<string, unknown> & { id?: string };

  const sender = stringField(record, "sender", "");
  const receiver = stringField(record, "receiver", "—");
  const receiverAddress = stringField(record, "receiverAddress", "—");
  const destinationCountry = stringField(record, "destinationCountry", "—");
  const originPort = stringField(record, "originPort", "—");
  const destinationPort = stringField(record, "destinationPort", "—");
  const shippingLine = stringField(record, "shippingLine", "—");
  const containerNumber = stringField(record, "containerNumber", "—");
  const vesselName = stringField(record, "vesselName", "—");
  const voyageNumber = stringField(record, "voyageNumber", "—");
  const cargo = stringField(record, "cargo", "General cargo");
  const weight = stringField(record, "weight", "—");
  const departureDate = stringField(record, "departureDate", "");
  const eta = stringField(record, "eta", "");
  const locationName = stringField(record, "locationName", "At sea");

  const status = stringField(record, "status", "Booking Confirmed");
  const progress =
    typeof record.progress === "number" && !Number.isNaN(record.progress)
      ? record.progress
      : getStatusProgress(status);

  const coordinates = pointField(record, "coordinates", { lat: 0, lng: 0 });
  let route = routeField(record, "route", []);

  if (!route.length) {
    route = [coordinates];
  }

  const history = normalizeHistory(record.history, status, locationName);

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    trackingId: stringField(record, "trackingId", ""),
    sender: sender || "—",
    receiver,
    receiverAddress,
    destinationCountry,
    originPort,
    destinationPort,
    shippingLine,
    containerNumber,
    vesselName,
    voyageNumber,
    cargo,
    weight,
    departureDate,
    eta,
    createdAt: record.createdAt,
    lastUpdated: record.lastUpdated,
    locationName,
    status,
    progress,
    coordinates,
    route,
    history
  };
}

function stringField(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function pointField(source: Record<string, unknown>, key: string, fallback: { lat: number; lng: number }) {
  const value = source[key];
  if (value && typeof value === "object" && "lat" in value && "lng" in value) {
    const lat = Number((value as { lat: unknown }).lat);
    const lng = Number((value as { lng: unknown }).lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  return fallback;
}

function routeField(source: Record<string, unknown>, key: string, fallback: { lat: number; lng: number }[]) {
  const value = source[key];
  if (!Array.isArray(value)) return fallback;
  const points = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const lat = Number((item as { lat?: unknown }).lat);
      const lng = Number((item as { lng?: unknown }).lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng };
    })
    .filter(Boolean) as { lat: number; lng: number }[];
  return points.length ? points : fallback;
}

function normalizeHistory(history: unknown, status: string, locationName: string): ShipmentHistoryItem[] {
  if (!Array.isArray(history) || !history.length) {
    return [{ status, date: new Date().toISOString().slice(0, 10), locationName }];
  }
  return history.map((entry) => {
    const obj = entry as Record<string, unknown>;
    const resolvedLocation = typeof obj.locationName === "string" ? obj.locationName : locationName;
    return {
      status: typeof obj.status === "string" ? obj.status : status,
      date: obj.date ?? new Date().toISOString().slice(0, 10),
      locationName: resolvedLocation
    };
  });
}

function getFirebaseErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code || "");
  }
  return "unknown";
}
