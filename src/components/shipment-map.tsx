"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { RoutePoint } from "@/lib/types";

function formatLatLng(lat: number, lng: number) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir} · ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

function routeHasSpread(route: RoutePoint[]): boolean {
  if (route.length < 2) return false;
  const first = route[0];
  return route.some((p) => p.lat !== first.lat || p.lng !== first.lng);
}

const animatedShipDivIcon = L.divIcon({
  className: "ship-leaflet-div-icon",
  html: `
<div class="ship-marker-hit" aria-hidden="true">
  <span class="ship-marker-ripple"></span>
  <span class="ship-marker-ripple ship-marker-ripple--delay"></span>
  <svg class="ship-marker-svg" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h.5c0 1.11.89 2 2 2a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2 2 2 0 0 0 2-2h.5a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4zm-.5 2h9v5h-9V5zm10.5 0h2v5h-2V5zM5 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0h2v2H9V7z"/>
  </svg>
</div>`.trim(),
  iconSize: [52, 52],
  iconAnchor: [26, 26],
  popupAnchor: [0, -22]
});

function MapFitRoute({
  route,
  centerLat,
  centerLng
}: {
  route: RoutePoint[];
  centerLat: number;
  centerLng: number;
}) {
  const map = useMap();
  useEffect(() => {
    const hasSpread = routeHasSpread(route);
    if (hasSpread) {
      const bounds = L.latLngBounds(route.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 48], animate: true, maxZoom: 9 });
      return;
    }
    map.setView([centerLat, centerLng], 5, { animate: true });
  }, [map, route, centerLat, centerLng]);

  return null;
}

type ShipmentMapProps = {
  coordinates: RoutePoint;
  route: RoutePoint[];
  locationName: string;
};

export function ShipmentMap({ coordinates, route, locationName }: ShipmentMapProps) {
  const { lat: centerLat, lng: centerLng } = coordinates;
  const center: [number, number] = [centerLat, centerLng];
  const path = useMemo((): [number, number][] => {
    if (route.length > 0) return route.map((point) => [point.lat, point.lng]);
    const c: [number, number] = [centerLat, centerLng];
    return [c, c];
  }, [route, centerLat, centerLng]);

  const coordsLabel = formatLatLng(coordinates.lat, coordinates.lng);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold">Vessel route map</h3>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
        <p className="text-xs font-semibold uppercase tracking-wide text-ocean-700 dark:text-ocean-500">
          Current location
        </p>
        <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{locationName}</p>
        <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">{coordsLabel}</p>
      </div>
      <div className="mt-4 h-[360px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <MapContainer center={center} zoom={5} scrollWheelZoom className="h-full w-full">
          <MapFitRoute route={route} centerLat={centerLat} centerLng={centerLng} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={path} color="#0369a1" weight={4} opacity={0.85} />
          <Marker key={`${coordinates.lat}:${coordinates.lng}`} position={center} icon={animatedShipDivIcon}>
            <Popup>
              <div className="text-sm font-medium">{locationName}</div>
              <div className="font-mono text-xs text-slate-600">{coordsLabel}</div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
