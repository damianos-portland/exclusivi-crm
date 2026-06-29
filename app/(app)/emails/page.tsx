import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const [logs, sentCount, failedCount, reminderCount] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 200,
      include: { customer: true },
    }),
    prisma.emailLog.count({ where: { status: "SENT" } }),
    prisma.emailLog.count({ where: { status: "FAILED" } }),
    prisma.emailLog.count({ where: { kind: "REMINDER" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ιστορικό Email</h1>
        <p className="text-sm text-[var(--muted)]">
          Κάθε email που στάλθηκε — χειροκίνητα ή αυτόματη υπενθύμιση
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Απεσταλμένα" value={sentCount} color="#16a34a" />
        <Kpi label="Αποτυχημένα" value={failedCount} color={failedCount > 0 ? "#dc2626" : undefined} />
        <Kpi label="Αυτόματες υπενθυμίσεις" value={reminderCount} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="th">Ημ/νία</th>
                <th className="th">Πελάτης</th>
                <th className="th">Προς</th>
                <th className="th">Θέμα</th>
                <th className="th">Τύπος</th>
                <th className="th">Κατάσταση</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="td whitespace-nowrap text-[var(--muted)]">
                    {formatDateTime(l.sentAt)}
                  </td>
                  <td className="td">
                    {l.customer ? (
                      <Link href={`/customers/${l.customer.id}`} className="hover:underline">
                        {l.customer.name}
                      </Link>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="td text-[var(--muted)]">{l.toEmail}</td>
                  <td className="td">{l.subject}</td>
                  <td className="td">
                    <span
                      className="badge"
                      style={
                        l.kind === "REMINDER"
                          ? { backgroundColor: "#f59e0b1a", color: "#b45309" }
                          : { backgroundColor: "#64748b1a", color: "#475569" }
                      }
                    >
                      {l.kind === "REMINDER" ? "Υπενθύμιση" : "Χειροκίνητο"}
                    </span>
                  </td>
                  <td className="td">
                    {l.status === "SENT" ? (
                      <span className="badge" style={{ backgroundColor: "#16a34a1a", color: "#16a34a" }}>
                        ✓ Στάλθηκε
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{ backgroundColor: "#dc26261a", color: "#dc2626" }}
                        title={l.error ?? ""}
                      >
                        ✕ Αποτυχία
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="td py-10 text-center text-[var(--muted)]">
                    Δεν έχει σταλεί ακόμη κανένα email.
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

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: color ?? "inherit" }}>
        {value}
      </div>
    </div>
  );
}
