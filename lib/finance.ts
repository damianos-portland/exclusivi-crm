import { withVat } from "./money";

export type ChargeLike = {
  amount: number;
  vatRate: number;
  dueDate: Date | null;
  status: string;
  receipts: { amount: number }[];
};

export type ChargeComputed = {
  gross: number; // συμφωνηθέν με ΦΠΑ (λεπτά)
  paid: number; // εισπραγμένα (λεπτά)
  remaining: number; // υπόλοιπο (λεπτά)
  status: PaymentStatus;
  isOverdue: boolean;
  daysOverdue: number;
};

export type PaymentStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "Εξοφλημένο",
  PARTIAL: "Μερική πληρωμή",
  PENDING: "Εκκρεμεί",
  OVERDUE: "Ληξιπρόθεσμο",
};

export const STATUS_COLORS: Record<PaymentStatus, string> = {
  PAID: "#16a34a",
  PARTIAL: "#d97706",
  PENDING: "#64748b",
  OVERDUE: "#dc2626",
};

export function computeCharge(charge: ChargeLike, now: Date = new Date()): ChargeComputed {
  const gross = withVat(charge.amount, charge.vatRate);
  const paid = charge.receipts.reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, gross - paid);

  let status: PaymentStatus;
  if (remaining <= 0) status = "PAID";
  else if (paid > 0) status = "PARTIAL";
  else status = "PENDING";

  let isOverdue = false;
  let daysOverdue = 0;
  if (status !== "PAID" && charge.dueDate) {
    const diff = now.getTime() - new Date(charge.dueDate).getTime();
    if (diff > 0) {
      isOverdue = true;
      daysOverdue = Math.floor(diff / (1000 * 60 * 60 * 24));
      status = "OVERDUE";
    }
  }

  return { gross, paid, remaining, status, isOverdue, daysOverdue };
}

// ── AR aging (ενηλικίωση απαιτήσεων) ──────────────────────────────
export type AgingBuckets = {
  current: number; // δεν έχει λήξει ακόμα / χωρίς ημ. λήξης
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total: number;
};

export const AGING_LABELS: Record<keyof Omit<AgingBuckets, "total">, string> = {
  current: "Τρέχον",
  d1_30: "1–30 ημ.",
  d31_60: "31–60 ημ.",
  d61_90: "61–90 ημ.",
  d90_plus: "90+ ημ.",
};

export function agingForCharges(charges: ChargeLike[], now: Date = new Date()): AgingBuckets {
  const b: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
  for (const c of charges) {
    const comp = computeCharge(c, now);
    if (comp.remaining <= 0) continue;
    b.total += comp.remaining;
    const d = comp.daysOverdue;
    if (!comp.isOverdue || d <= 0) b.current += comp.remaining;
    else if (d <= 30) b.d1_30 += comp.remaining;
    else if (d <= 60) b.d31_60 += comp.remaining;
    else if (d <= 90) b.d61_90 += comp.remaining;
    else b.d90_plus += comp.remaining;
  }
  return b;
}

export type CustomerCharges = { charges: ChargeLike[] };

export function aggregateCustomer(customer: CustomerCharges, now: Date = new Date()) {
  let agreed = 0;
  let paid = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const c of customer.charges) {
    const comp = computeCharge(c, now);
    agreed += comp.gross;
    paid += comp.paid;
    outstanding += comp.remaining;
    if (comp.status === "OVERDUE") overdue += comp.remaining;
  }
  return { agreed, paid, outstanding, overdue };
}
