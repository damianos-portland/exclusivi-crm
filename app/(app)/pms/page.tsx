import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { aggregateCustomer } from "@/lib/finance";

export const dynamic = "force-dynamic";

type Row = {
  pms: string;
  clients: number;
  agreed: number;
  collected: number;
  outstanding: number;
};

export default async function PmsPage() {
  const now = new Date();
  const customers = await prisma.customer.findMany({
    include: { charges: { include: { receipts: true } } },
  });

  const map = new Map<string, Row>();
  for (const c of customers) {
    const key = c.pms?.trim() || "— Not set —";
    const agg = aggregateCustomer(c, now);
    const row = map.get(key) ?? { pms: key, clients: 0, agreed: 0, collected: 0, outstanding: 0 };
    row.clients += 1;
    row.agreed += agg.agreed;
    row.collected += agg.paid;
    row.outstanding += agg.outstanding;
    map.set(key, row);
  }

  const rows = [...map.values()].sort((a, b) => b.clients - a.clients);
  const maxClients = Math.max(1, ...rows.map((r) => r.clients));
  const totalClients = customers.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">PMS analytics</h1>
        <p className="text-sm text-[var(--muted)]">
          Clients and revenue grouped by Property Management System
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">PMS</th>
              <th className="th">Clients</th>
              <th className="th text-right">Agreed</th>
              <th className="th text-right">Collected</th>
              <th className="th text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.pms} className="hover:bg-slate-50">
                <td className="td font-medium">{r.pms}</td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm">{r.clients}</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)]"
                        style={{ width: `${(r.clients / maxClients) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="td text-right">{formatMoney(r.agreed)}</td>
                <td className="td text-right text-green-600">{formatMoney(r.collected)}</td>
                <td className="td text-right font-medium">
                  {r.outstanding > 0 ? (
                    formatMoney(r.outstanding)
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-10 text-center text-[var(--muted)]">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t bg-slate-50 font-semibold">
              <tr>
                <td className="td">{rows.length} systems</td>
                <td className="td">{totalClients}</td>
                <td className="td text-right">
                  {formatMoney(rows.reduce((s, r) => s + r.agreed, 0))}
                </td>
                <td className="td text-right text-green-600">
                  {formatMoney(rows.reduce((s, r) => s + r.collected, 0))}
                </td>
                <td className="td text-right">
                  {formatMoney(rows.reduce((s, r) => s + r.outstanding, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
