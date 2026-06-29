/** Date → "yyyy-mm-dd" για <input type="date">. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Date → dd/mm/yyyy. */
export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(LOCALE);
}

/** Advance a date by a recurrence interval. */
export function advanceInterval(from: Date, interval: string): Date {
  const d = new Date(from);
  switch (interval) {
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "MONTHLY":
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

export const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const LOCALE = "en-GB";

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
