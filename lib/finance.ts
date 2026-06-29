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
