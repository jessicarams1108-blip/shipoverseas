export const TRACKING_ID_REGEX = /^[A-Z]{4}\d{7}$/;

export function generateTrackingId(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const digits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `${prefix}${digits}`;
}
