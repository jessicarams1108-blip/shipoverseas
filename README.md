# ShipOverseas Cargo Control

ShipOverseas is the current sea cargo tracker in `shipoverseas/`. It includes a professional homepage, public tracking, customer registration/login, password reset, customer support chat, simulated email updates, and an admin-only operations console.

Admin package tools are locked to:

```text
Hardewusi@gmail.com
```

Run the current app locally:

```bash
npm run shipoverseas:dev
```

The public test deployment path is documented in `shipoverseas/DEPLOYMENT.md`, and `render.yaml` is included for Render Blueprint deployment with a persistent disk.

## Legacy Next/Firebase App

Simulation-based cargo tracking platform built with Next.js, Tailwind CSS, Firebase Firestore, and Leaflet/OpenStreetMap.

## Features

- Tracking search page (`/`)
- Shipment tracking result page (`/track/[trackingId]`)
- Timeline status with current step highlighting
- Vessel location map with route polyline
- ETA and animated progress bar
- Admin panel (`/admin`) to create and update shipments
- Simple admin access check (`admin@example.com`)
- Responsive UI with dark/light mode

## Setup

1. Install Node.js (includes `npm`)
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` from `.env.example` and provide Firebase config values.
4. Create Firestore collection `shipments`.
5. Run development server:

```bash
npm run dev
```

## Firestore Shipment Schema

Use documents in `shipments` collection with this shape:

```json
{
  "trackingId": "SEA123456789",
  "sender": "John Logistics Ltd",
  "receiver": "Michael Imports",
  "cargo": "Electronics",
  "weight": "1200kg",
  "origin": "Shanghai, China",
  "destination": "Los Angeles, USA",
  "status": "At Sea",
  "progress": 45,
  "eta": "2026-05-20",
  "coordinates": {
    "lat": 25.3,
    "lng": -140.2
  },
  "route": [
    { "lat": 31.2, "lng": 121.5 },
    { "lat": 28.0, "lng": 160.0 },
    { "lat": 25.3, "lng": -140.2 }
  ],
  "history": [
    { "status": "Departed Origin Port", "date": "2026-05-01" },
    { "status": "At Sea", "date": "2026-05-05" }
  ]
}
```
