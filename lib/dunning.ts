// Dunning sequence: escalating payment reminders based on days overdue.
// Each step maps to an email template (by name) with a built-in fallback.

export type DunningStep = {
  key: "GENTLE" | "FIRM" | "FINAL";
  minDays: number; // send this step once overdue >= minDays
  templateName: string;
  fallbackSubject: string;
  fallbackBody: string;
};

export const DUNNING_STEPS: DunningStep[] = [
  {
    key: "GENTLE",
    minDays: 1,
    templateName: "Payment reminder",
    fallbackSubject: "Payment reminder — Exclusivi",
    fallbackBody:
      "Dear {{contact}},\n\nThis is a friendly reminder that {{amount}} is outstanding for {{name}} (due {{due}}). Please arrange settlement when convenient.\n\nBest regards,\nExclusivi",
  },
  {
    key: "FIRM",
    minDays: 8,
    templateName: "Payment reminder — firm",
    fallbackSubject: "Overdue payment — action needed",
    fallbackBody:
      "Dear {{contact}},\n\nOur records show {{amount}} remains overdue for {{name}} (due {{due}}). We kindly ask you to settle this within the next few days.\n\nBest regards,\nExclusivi",
  },
  {
    key: "FINAL",
    minDays: 22,
    templateName: "Payment reminder — final",
    fallbackSubject: "Final notice — overdue payment",
    fallbackBody:
      "Dear {{contact}},\n\nThis is a final notice regarding the overdue amount of {{amount}} for {{name}} (due {{due}}). Please settle immediately to avoid further action.\n\nBest regards,\nExclusivi",
  },
];

export const DUNNING_LABELS: Record<string, string> = {
  GENTLE: "Gentle",
  FIRM: "Firm",
  FINAL: "Final",
};

/** Returns the appropriate dunning step for a given days-overdue, or null. */
export function stepForDays(daysOverdue: number): DunningStep | null {
  let chosen: DunningStep | null = null;
  for (const s of DUNNING_STEPS) {
    if (daysOverdue >= s.minDays) chosen = s;
  }
  return chosen;
}
