import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { aggregateCustomer } from "@/lib/finance";
import { createCustomer } from "@/app/actions";
import { FormModal } from "@/components/FormModal";
import { CustomerFields } from "@/components/CustomerFields";
import { CustomerStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { contactPerson: { contains: q } },
          { email: { contains: q } },
          { vatNumber: { contains: q } },
        ],
      }
    : {};

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { charges: { include: { receipts: true } } },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Πελάτες</h1>
          <p className="text-sm text-[var(--muted)]">{customers.length} εγγραφές</p>
        </div>
        <FormModal
          trigger="+ Νέος πελάτης"
          title="Νέος πελάτης"
          action={createCustomer}
          submitLabel="Δημιουργία"
        >
          <CustomerFields />
        </FormModal>
      </div>

      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Αναζήτηση: επωνυμία, ΑΦΜ, email…"
          className="input"
        />
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="th">Πελάτης</th>
                <th className="th">Επικοινωνία</th>
                <th className="th">PMS</th>
                <th className="th">Κατάσταση</th>
                <th className="th text-right">Υπόλοιπο</th>
                <th className="th text-right">Ληξιπρόθεσμα</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => {
                const agg = aggregateCustomer(c, now);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.contactPerson && (
                        <div className="text-xs text-[var(--muted)]">{c.contactPerson}</div>
                      )}
                    </td>
                    <td className="td text-[var(--muted)]">
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                    </td>
                    <td className="td">
                      {c.pms ? (
                        <span className="badge bg-slate-100 text-slate-700">{c.pms}</span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="td">
                      <CustomerStatusBadge status={c.status} />
                    </td>
                    <td className="td text-right font-medium">
                      {formatMoney(agg.outstanding)}
                    </td>
                    <td className="td text-right">
                      {agg.overdue > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatMoney(agg.overdue)}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="td py-10 text-center text-[var(--muted)]">
                    Δεν βρέθηκαν πελάτες.
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
