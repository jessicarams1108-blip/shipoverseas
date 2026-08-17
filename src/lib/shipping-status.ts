export const SHIPPING_STATUSES = [
  "Booking Confirmed",
  "Container Picked Up",
  "At Origin Warehouse",
  "Loaded at Origin Port",
  "Departed Origin Port",
  "At Sea",
  "Mid-Ocean Transit",
  "Near Destination Port",
  "Arrived at Destination Port",
  "Customs Clearance",
  "Out for Delivery",
  "Delivered"
] as const;

export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export const STATUS_PROGRESS_MAP: Record<ShippingStatus, number> = {
  "Booking Confirmed": 5,
  "Container Picked Up": 12,
  "At Origin Warehouse": 20,
  "Loaded at Origin Port": 30,
  "Departed Origin Port": 40,
  "At Sea": 50,
  "Mid-Ocean Transit": 65,
  "Near Destination Port": 80,
  "Arrived at Destination Port": 88,
  "Customs Clearance": 93,
  "Out for Delivery": 97,
  Delivered: 100
};

export function getStatusProgress(status: string): number {
  const match = SHIPPING_STATUSES.find((item) => item === status);
  return match ? STATUS_PROGRESS_MAP[match] : 0;
}

export function getNextStep(status: string): string {
  const index = SHIPPING_STATUSES.findIndex((item) => item === status);
  if (index < 0 || index >= SHIPPING_STATUSES.length - 1) return "Shipment completed";
  return SHIPPING_STATUSES[index + 1];
}
