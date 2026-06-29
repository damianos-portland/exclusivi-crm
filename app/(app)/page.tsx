import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { computeCharge, aggregateCustomer } from "@/lib/finance";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [customers, monthPayments, openTasks] = await Promise.all([
    prisma.customer.findMany({
      include: { charges: { include: { receipts: true } } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: monthStart } },
    }),
    prisma.task.findMany({
      where: { done: false },
      orderBy: { dueDate: "asc" },
      include: { customer: true },
      take: 6,
    }),
  ]);

  // Συγκεντρωτικά
  let agreed = 0,
    paid = 0,
    outstanding = 0,
    overdue = 0;
  for (const c of customers) {
    const a = aggregateCustomer(c, now);
    agreed += a.agreed;
    paid += a.paid;
    outstanding += a.outstanding;
    overdue += a.overdue;
  }

  // Ληξιπρόθεσμες χρεώσεις (για τη λίστα «χρειάζονται προσοχή»)
  const overdueCharges = customers
    .flatMap((c) =>
      c.charges.map((ch) => ({ customer: c, charge: ch, comp: computeCharge(ch, now) }))
    )
    .filter((x) => x.comp.status === "OVERDUE")
    .sort((a, b) => b.comp.daysOverdue - a.comp.daysOverdue);

  const monthRevenue = monthPayments._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Επισκόπηση</h1>
          <p className="text-sm text-[var(--muted)]">
            Συνολική εικόνα πελατών & πληρωμών
          </p>
        </div>
        <Link href="/customers" className="btn-primary btn-sm">
          + Νέος πελάτης
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Αναμενόμενα (υπόλοιπο)" value={formatMoney(outstanding)} tone="default" />
        <Kpi
          label="Ληξιπρόθεσμα"
          value={formatMoney(overdue)}
          sub={`${overdueCharges.length} χρεώσεις`}
          tone="danger"
        />
        <Kpi label="Εισπράξεις μήνα" value={formatMoney(monthRevenue)} tone="success" />
        <Kpi
          label="Συνολικά εισπραγμένα"
          value={formatMoney(paid)}
          sub={`από ${formatMoney(agreed)}`}
          tone="default"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Χρειάζονται προσοχή */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">⚠ Χρειάζονται προσοχή</h2>
            <span className="text-xs text-[var(--muted)]">
              {overdueCharges.length} ληξιπρόθεσμα
            </span>
          </div>
          {overdueCharges.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              Καμία ληξιπρόθεσμη οφειλή 🎉
            </p>
          ) : (
            <div className="divide-y">
              {overdueCharges.slice(0, 8).map(({ customer, charge, comp }) => (
                <Link
                  key={charge.id}
                  href={`/customers/${customer.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {charge.title} · {comp.daysOverdue} ημέρες καθυστέρηση
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">
                      {formatMoney(comp.remaining)}
                    </div>
                    <StatusBadge status={comp.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Εκκρεμότητες */}
        <div className="card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">Εκκρεμότητες</h2>
            <Link href="/tasks" className="text-xs text-[var(--accent)]">
              Όλες →
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              Καμία εκκρεμότητα
            </p>
          ) : (
            <ul className="divide-y">
              {openTasks.map((t) => (
                <li key={t.id} className="px-5 py-3 text-sm">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {t.customer ? t.customer.name + " · " : ""}
                    {t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString("el-GR")
                      : "χωρίς προθεσμία"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "default" | "danger" | "success";
}) {
  const color =
    tone === "danger" ? "#dc2626" : tone === "success" ? "#16a34a" : "var(--foreground)";
  return (
    <div className="card p-5">
      <div className="text-xs font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold" style={{ color }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}
