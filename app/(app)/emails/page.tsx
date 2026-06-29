import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const KIND_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  REMINDER: { label: "Reminder", bg: "#f59e0b1a", fg: "#b45309" },
  INBOUND: { label: "Received", bg: "#4f46e51a", fg: "#4f46e5" },
  MANUAL: { label: "Manual", bg: "#64748b1a", fg: "#475569" },
};

export default async function EmailsPage() {
  const [logs, sentCount, failedCount, reminderCount, inboundCount] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 200,
      include: { customer: true },
    }),
    prisma.emailLog.count({ where: { status: "SENT", kind: { not: "INBOUND" } } }),
    prisma.emailLog.count({ where: { status: "FAILED" } }),
    prisma.emailLog.count({ where: { kind: "REMINDER" } }),
    prisma.emailLog.count({ where: { kind: "INBOUND" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email log</h1>
        <p className="text-sm text-[var(--muted)]">
          Every email sent — manual or automatic reminder — plus received replies
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Sent" value={sentCount} color="#16a34a" />
        <Kpi label="Failed" value={failedCount} color={failedCount > 0 ? "#dc2626" : undefined} />
        <Kpi label="Auto reminders" value={reminderCount} />
        <Kpi label="Replies received" value={inboundCount} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">Client</th>
                <th className="th">Party</th>
                <th className="th">Subject</th>
                <th className="th">Type</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l) => {
                const k = KIND_STYLE[l.kind] ?? KIND_STYLE.MANUAL;
                const inbound = l.kind === "INBOUND";
                return (
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
                    <td className="td text-[var(--muted)]">
                      {inbound ? `from ${l.fromEmail}` : `to ${l.toEmail}`}
                    </td>
                    <td className="td">{l.subject}</td>
                    <td className="td">
                      <span className="badge" style={{ backgroundColor: k.bg, color: k.fg }}>
                        {k.label}
                      </span>
                    </td>
                    <td className="td">
                      {inbound ? (
                        <span className="badge" style={{ backgroundColor: "#4f46e51a", color: "#4f46e5" }}>
                          ↓ Received
                        </span>
                      ) : l.status === "SENT" ? (
                        <span className="badge" style={{ backgroundColor: "#16a34a1a", color: "#16a34a" }}>
                          ✓ Sent
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{ backgroundColor: "#dc26261a", color: "#dc2626" }}
                          title={l.error ?? ""}
                        >
                          ✕ Failed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="td py-10 text-center text-[var(--muted)]">
                    No emails yet.
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
