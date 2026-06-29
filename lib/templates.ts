// Render template μεταβλητών — καθαρό module (χρησιμοποιείται σε server & client).

export type TemplateVars = Record<string, string>;

export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v !== undefined && v !== null && v !== "" ? v : `{{${key}}}`;
  });
}

export const TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "name", label: "Client name" },
  { key: "contact", label: "Contact person" },
  { key: "amount", label: "Amount due" },
  { key: "total", label: "Total agreed" },
  { key: "due", label: "Due date" },
  { key: "vat", label: "VAT number" },
  { key: "paylink", label: "Payment link" },
  { key: "today", label: "Today's date" },
];
