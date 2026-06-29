// Χρηματικά ποσά αποθηκεύονται σε λεπτά (integer). Εδώ τα helpers μετατροπής.

/** Μετατρέπει λεπτά → "1.234,56 €" (ελληνική μορφή). */
export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Μετατρέπει string εισόδου (π.χ. "1234,56" ή "1234.56") → λεπτά. */
export function parseMoneyToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const normalized = String(input).trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** Λεπτά → καθαρός αριθμός για inputs (π.χ. 1234.56). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Συνολικό ποσό με ΦΠΑ (σε λεπτά). */
export function withVat(cents: number, vatRate: number): number {
  return Math.round(cents * (1 + vatRate / 100));
}
