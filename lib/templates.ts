// Render template μεταβλητών — καθαρό module (χρησιμοποιείται σε server & client).

export type TemplateVars = Record<string, string>;

export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v !== undefined && v !== null && v !== "" ? v : `{{${key}}}`;
  });
}

export const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "name", label: "Επωνυμία πελάτη" },
  { key: "contact", label: "Υπεύθυνος επικοινωνίας" },
  { key: "amount", label: "Οφειλόμενο ποσό" },
  { key: "total", label: "Συνολικό συμφωνηθέν" },
  { key: "due", label: "Ημ/νία λήξης" },
  { key: "vat", label: "ΑΦΜ" },
  { key: "today", label: "Σημερινή ημερομηνία" },
];
