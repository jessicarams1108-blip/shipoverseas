export function toDateValue(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "string" || typeof input === "number") return new Date(input);
  if (typeof input === "object" && input !== null && "toDate" in input && typeof input.toDate === "function") {
    return (input as { toDate: () => Date }).toDate();
  }
  return null;
}

export function formatUtcDateTime(input: unknown): string {
  const date = toDateValue(input);
  if (!date || Number.isNaN(date.getTime())) return "Not available";
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = date.toLocaleString("en-US", { day: "2-digit", timeZone: "UTC" });
  const year = date.toLocaleString("en-US", { year: "numeric", timeZone: "UTC" });
  const hh = date.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "UTC" });
  const mm = date.toLocaleString("en-US", { minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${month} ${day}, ${year} — ${hh}:${mm} UTC`;
}

export function etaCountdown(eta: string): string {
  const etaDate = new Date(eta);
  if (Number.isNaN(etaDate.getTime())) return "ETA unavailable";
  const now = new Date();
  const diff = etaDate.getTime() - now.getTime();
  if (diff <= 0) return "Arriving today or delivered";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}
