import { clsx, type ClassValue } from "clsx";

/** Merge conditional class names. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** "James Carter" style full name. */
export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

/** Initials for avatar chips: "James Carter" -> "JC". */
export function initials(p: { firstName: string; lastName: string }) {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** Deterministic date rendering (UTC) so server/client output always matches. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DATE_FORMAT.format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return `${DATETIME_FORMAT.format(new Date(date))} UTC`;
}

/** Show a stored UTC instant in an organization or user timezone. */
export function formatInTimeZone(date: Date | string | null | undefined, timeZone = "UTC") {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(date));
  } catch {
    return formatDateTime(date);
  }
}

/** Only allow internal, relative redirect targets (blocks open redirects). */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}
