export type RoutePoint = {
  lat: number;
  lng: number;
};

export type ShipmentHistoryItem = {
  status: string;
  date: unknown;
  locationName?: string;
};

export type Shipment = {
  id?: string;
  trackingId: string;
  sender: string;
  receiver: string;
  receiverAddress: string;
  destinationCountry: string;
  originPort: string;
  destinationPort: string;
  shippingLine: string;
  containerNumber: string;
  vesselName: string;
  voyageNumber: string;
  cargo: string;
  weight: string;
  departureDate: string;
  eta: string;
  createdAt?: unknown;
  lastUpdated?: unknown;
  locationName: string;
  status: string;
  progress: number;
  coordinates: RoutePoint;
  route: RoutePoint[];
  history: ShipmentHistoryItem[];
};
