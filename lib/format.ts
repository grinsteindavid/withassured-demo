// Hydration-safe date helpers. Always format in UTC + explicit locale so the
// server (UTC container) and the client (user's local timezone) agree.

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
};

export function formatDate(input: string | Date): string {
  return new Date(input).toLocaleDateString("en-US", DATE_OPTIONS);
}

export function formatDateTime(input: string | Date): string {
  return new Date(input).toLocaleString("en-US", DATE_TIME_OPTIONS);
}
