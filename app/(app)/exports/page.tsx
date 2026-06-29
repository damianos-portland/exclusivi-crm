import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { agingForCharges, AGING_LABELS, type AgingBuckets } from "@/lib/finance";

export const dynamic = "force-dynamic";

const REPORTS = [
  { type: "aging", label: "Accounts receivable aging", desc: "Outstanding balances per client & overdue bucket" },
  { type: "vat", label: "Charges & VAT", desc: "Net, VAT, total, collected per charge" },
  { type: "ledger", label: "Payments ledger", desc: "All payments with date & method" },
  { type: "customers", label: "Client list", desc: "Full client list with totals" },
];

export default async function ExportsPage() {
  const now = new Date();
  const customers = await prisma.customer.findMany({
    include: { charges: { include: { receipts: true } } },
    orderBy: { name: "asc" },
  });

  const perCustomer = customers
    .map((c) => ({ c, a: agingForCharges(c.charges, now) }))
    .filter((x) => x.a.total > 0)
    .sort((x, y) => y.a.total - x.a.total);

  const totals: AgingBuckets = perCustomer.reduce(
    (acc, { a }) => ({
      current: acc.current + a.current,
      d1_30: acc.d1_30 + a.d1_30,
      d31_60: acc.d31_60 + a.d31_60,
      d61_90: acc.d61_90 + a.d61_90,
      d90_plus: acc.d90_plus + a.d90_plus,
      total: acc.total + a.total,
    }),
    { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 }
  );

  const bucketKeys: (keyof typeof AGING_LABELS)[] = ["current", "d1_30", "d31_60", "d61_90", "d90_plus"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Exports & Reports</h1>
        <p className="text-sm text-[var(--muted)]">
          Accountant-ready reports — download as CSV (opens in Excel)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <a
            key={r.type}
            href={`/api/export?type=${r.type}`}
            className="card flex items-center justify-between p-4 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium">{r.label}</div>
              <div className="text-xs text-[var(--muted)]">{r.desc}</div>
            </div>
            <span className="btn-primary btn-sm shrink-0">↓ CSV</span>
          </a>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Accounts receivable aging</h2>
          <span className="text-sm font-semibold">{formatMoney(totals.total)} total outstanding</span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-5">
          {bucketKeys.map((k) => (
            <div key={k} className="bg-[var(--surface)] p-4 text-center">
              <div className="text-xs text-[var(--muted)]">{AGING_LABELS[k]}</div>
              <div
                className="mt-1 font-semibold"
                style={{ color: k === "d61_90" || k === "d90_plus" ? "#dc2626" : "inherit" }}
              >
                {formatMoney(totals[k])}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto border-t">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Client</th>
                {bucketKeys.map((k) => (
                  <th key={k} className="th text-right">
                    {AGING_LABELS[k]}
                  </th>
                ))}
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {perCustomer.map(({ c, a }) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{c.name}</td>
                  {bucketKeys.map((k) => (
                    <td key={k} className="td text-right">
                      {a[k] > 0 ? formatMoney(a[k]) : <span className="text-[var(--muted)]">—</span>}
                    </td>
                  ))}
                  <td className="td text-right font-semibold">{formatMoney(a.total)}</td>
                </tr>
              ))}
              {perCustomer.length === 0 && (
                <tr>
                  <td colSpan={7} className="td py-8 text-center text-[var(--muted)]">
                    No open balances.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
