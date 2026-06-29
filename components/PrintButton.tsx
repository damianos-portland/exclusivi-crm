"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary btn-sm no-print">
      ↓ Εκτύπωση / Αποθήκευση PDF
    </button>
  );
}
