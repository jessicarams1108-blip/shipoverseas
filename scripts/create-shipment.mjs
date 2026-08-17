import { readFileSync } from "node:fs";
import { initializeApp, getApps } from "firebase/app";
import { addDoc, collection, getDocs, query, serverTimestamp, where, getFirestore } from "firebase/firestore";

function loadEnvFile(path) {
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const trackingId = process.argv[2] || "MSCU9201917";
const sender = process.argv[3] || "Mediterranean Shipping Company (MSC)";
const status = process.argv[4] || "At Sea";
const progress = status === "Booking Confirmed" ? 5 : 56;

const existing = await getDocs(query(collection(db, "shipments"), where("trackingId", "==", trackingId)));
if (!existing.empty) {
  console.log(`Shipment ${trackingId} already exists.`);
  process.exit(0);
}

const payload = {
  trackingId,
  sender,
  receiver: "Viviane Narda Rietkerken",
  receiverAddress: "Scherpgras 105, 3206 SL Spijkenisse, The Netherlands",
  destinationCountry: "Netherlands",
  phoneNumber: "+31 0625520109",
  receiverEmail: "vina112@outlook.com",
  gender: "Female",
  dateOfBirth: "1928-11-29",
  nationality: "Netherlands",
  originPort: "Baltimore, MD, USA",
  destinationPort: "Rotterdam, Netherlands",
  shippingLine: "Mediterranean Shipping Company (MSC)",
  containerNumber: trackingId,
  vesselName: "MSC Grandiosa",
  voyageNumber: "VOY9201",
  cargo: "Vehicle (Land Rover Defender 110 – Urban Edition)",
  weight: "2600 kg",
  departureDate: "2026-04-30",
  eta: "2026-05-18",
  locationName: "Mid-Atlantic Ocean (en route to Rotterdam)",
  status,
  progress,
  coordinates: { lat: 40.7128, lng: -30.0 },
  route: [
    { lat: 39.2904, lng: -76.6122 },
    { lat: 38.0, lng: -60.0 },
    { lat: 36.5, lng: -45.0 },
    { lat: 40.7128, lng: -30.0 },
    { lat: 51.9244, lng: 4.4777 }
  ],
  history: [
    { status: "Booking Confirmed", date: "2026-04-30", locationName: "Baltimore, MD, USA" },
    { status: "Loaded at Origin Port", date: "2026-05-01", locationName: "Baltimore Port" },
    { status: "Departed Origin Port", date: "2026-05-02", locationName: "Baltimore, MD, USA" },
    { status, date: "2026-05-05", locationName: "Mid-Atlantic Ocean (en route to Rotterdam)" }
  ],
  createdAt: serverTimestamp(),
  lastUpdated: serverTimestamp()
};

const ref = await addDoc(collection(db, "shipments"), payload);
console.log(`Created shipment ${trackingId} with doc id ${ref.id}`);
