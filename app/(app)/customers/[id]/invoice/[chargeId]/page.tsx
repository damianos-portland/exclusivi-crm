import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, withVat } from "@/lib/money";
import { computeCharge } from "@/lib/finance";
import { formatDate } from "@/lib/dates";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string; chargeId: string }>;
}) {
  const { id, chargeId } = await params;
  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
    include: { customer: true, receipts: { orderBy: { paidAt: "asc" } } },
  });
  if (!charge || charge.customerId !== id) notFound();

  const now = new Date();
  const comp = computeCharge(charge, now);
  const vatAmount = withVat(charge.amount, charge.vatRate) - charge.amount;
  const isReceipt = comp.remaining <= 0;
  const docTitle = isReceipt ? "ΑΠΟΔΕΙΞΗ" : "ΤΙΜΟΛΟΓΙΟ";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <Link href={`/customers/${id}`} className="text-sm text-[var(--muted)] hover:underline">
          ← Πίσω στον πελάτη
        </Link>
        <PrintButton />
      </div>

      <div className="print-sheet card mx-auto max-w-2xl p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] font-bold text-white">
                E
              </span>
              <span className="text-lg font-semibold">Exclusivi</span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">bk@exclusivi.com</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold tracking-wide">{docTitle}</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Αρ.: {charge.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-xs text-[var(--muted)]">Ημ/νία: {formatDate(now)}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">Προς</div>
            <div className="font-medium">{charge.customer.name}</div>
            {charge.customer.contactPerson && <div>{charge.customer.contactPerson}</div>}
            {charge.customer.vatNumber && <div>ΑΦΜ: {charge.customer.vatNumber}</div>}
            {charge.customer.address && <div>{charge.customer.address}</div>}
            {charge.customer.email && <div>{charge.customer.email}</div>}
          </div>
          <div className="text-right">
            <div className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">
              Ημ/νία λήξης
            </div>
            <div className="font-medium">{formatDate(charge.dueDate)}</div>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y bg-slate-50">
              <th className="px-3 py-2 text-left font-semibold">Περιγραφή</th>
              <th className="px-3 py-2 text-right font-semibold">Καθαρή αξία</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-3 py-3">{charge.title}</td>
              <td className="px-3 py-3 text-right">{formatMoney(charge.amount, charge.currency)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
          <Row label="Καθαρή αξία" value={formatMoney(charge.amount, charge.currency)} />
          <Row label={`ΦΠΑ ${charge.vatRate}%`} value={formatMoney(vatAmount, charge.currency)} />
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Σύνολο</span>
            <span>{formatMoney(comp.gross, charge.currency)}</span>
          </div>
          {comp.paid > 0 && (
            <Row label="Εισπραχθέντα" value={`− ${formatMoney(comp.paid, charge.currency)}`} />
          )}
          <div
            className="flex justify-between border-t pt-2 font-semibold"
            style={{ color: comp.remaining > 0 ? "#dc2626" : "#16a34a" }}
          >
            <span>{comp.remaining > 0 ? "Υπόλοιπο" : "Εξοφλήθηκε"}</span>
            <span>{formatMoney(comp.remaining, charge.currency)}</span>
          </div>
        </div>

        {/* Payments history */}
        {charge.receipts.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <div className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
              Ιστορικό πληρωμών
            </div>
            <ul className="space-y-1 text-sm">
              {charge.receipts.map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span className="text-[var(--muted)]">
                    {formatDate(r.paidAt)} · {r.method ?? "—"}
                  </span>
                  <span>{formatMoney(r.amount, charge.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 border-t pt-4 text-center text-xs text-[var(--muted)]">
          Εσωτερικό παραστατικό — δεν αποτελεί επίσημο φορολογικό στοιχείο (myDATA).
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
