import { STATUS_COLORS, STATUS_LABELS, type PaymentStatus } from "@/lib/finance";

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

const CUSTOMER_STATUS: Record<string, { label: string; color: string }> = {
  LEAD: { label: "Lead", color: "#0891b2" },
  ACTIVE: { label: "Ενεργός", color: "#16a34a" },
  CHURNED: { label: "Ανενεργός", color: "#64748b" },
};

export function CustomerStatusBadge({ status }: { status: string }) {
  const s = CUSTOMER_STATUS[status] ?? CUSTOMER_STATUS.ACTIVE;
  return (
    <span className="badge" style={{ backgroundColor: `${s.color}1a`, color: s.color }}>
      {s.label}
    </span>
  );
}
