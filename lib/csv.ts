// CSV helpers — UTF-8 με BOM ώστε να ανοίγουν σωστά τα ελληνικά στο Excel.

/** Λεπτά → ελληνικός αριθμός με κόμμα δεκαδικό, χωρίς διαχωριστικό χιλιάδων (Excel-friendly). */
export function centsToGreekNumber(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Φτιάχνει CSV string από headers + rows. Διαχωριστικό «;» (ελληνικό Excel). */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const sep = ";";
  const lines = [headers.map(escapeCell).join(sep)];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(sep));
  }
  return "﻿" + lines.join("\r\n");
}

/** Response headers για download CSV. */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
