// Χρηματικά ποσά αποθηκεύονται σε λεπτά (integer). Εδώ τα helpers μετατροπής.

/** Cents → "€1,234.56". */
export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Parse user input ("1,234.56", "1234.56", "1234,56") → cents. */
export function parseMoneyToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const s = String(input).trim().replace(/\s/g, "");
  let normalized: string;
  if (s.includes(".") && s.includes(",")) {
    normalized = s.replace(/,/g, ""); // comma = thousands, dot = decimal
  } else if (s.includes(",") && !s.includes(".")) {
    normalized = s.replace(",", "."); // lone comma = decimal
  } else {
    normalized = s.replace(/,/g, "");
  }
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
