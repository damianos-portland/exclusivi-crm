import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toCsv, csvResponse, centsToGreekNumber } from "@/lib/csv";
import { computeCharge, aggregateCustomer, agingForCharges, STATUS_LABELS } from "@/lib/finance";
import { withVat } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "aging";
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);

  if (type === "aging") {
    const customers = await prisma.customer.findMany({
      include: { charges: { include: { receipts: true } } },
      orderBy: { name: "asc" },
    });
    const rows = customers
      .map((c) => ({ c, a: agingForCharges(c.charges, now) }))
      .filter((x) => x.a.total > 0)
      .map(({ c, a }) => [
        c.name,
        c.vatNumber,
        c.pms,
        centsToGreekNumber(a.current),
        centsToGreekNumber(a.d1_30),
        centsToGreekNumber(a.d31_60),
        centsToGreekNumber(a.d61_90),
        centsToGreekNumber(a.d90_plus),
        centsToGreekNumber(a.total),
      ]);
    const csv = toCsv(
      ["Πελάτης", "ΑΦΜ", "PMS", "Τρέχον", "1-30", "31-60", "61-90", "90+", "Σύνολο υπολοίπου"],
      rows
    );
    return csvResponse(`aging_${stamp}.csv`, csv);
  }

  if (type === "ledger") {
    const payments = await prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      include: { charge: { include: { customer: true } } },
    });
    const rows = payments.map((p) => [
      formatDate(p.paidAt),
      p.charge.customer.name,
      p.charge.customer.vatNumber,
      p.charge.title,
      centsToGreekNumber(p.amount),
      p.method,
      p.note,
    ]);
    const csv = toCsv(
      ["Ημερομηνία", "Πελάτης", "ΑΦΜ", "Χρέωση", "Ποσό", "Τρόπος", "Σημείωση"],
      rows
    );
    return csvResponse(`eispraxeis_${stamp}.csv`, csv);
  }

  if (type === "vat") {
    const charges = await prisma.charge.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, receipts: true },
    });
    const rows = charges.map((ch) => {
      const comp = computeCharge(ch, now);
      const vatAmount = withVat(ch.amount, ch.vatRate) - ch.amount;
      return [
        formatDate(ch.createdAt),
        ch.customer.name,
        ch.customer.vatNumber,
        ch.title,
        centsToGreekNumber(ch.amount),
        `${ch.vatRate}%`,
        centsToGreekNumber(vatAmount),
        centsToGreekNumber(comp.gross),
        centsToGreekNumber(comp.paid),
        centsToGreekNumber(comp.remaining),
        STATUS_LABELS[comp.status],
        formatDate(ch.dueDate),
      ];
    });
    const csv = toCsv(
      [
        "Ημ/νία",
        "Πελάτης",
        "ΑΦΜ",
        "Περιγραφή",
        "Καθαρή αξία",
        "ΦΠΑ %",
        "Ποσό ΦΠΑ",
        "Σύνολο",
        "Εισπραγμένα",
        "Υπόλοιπο",
        "Κατάσταση",
        "Λήξη",
      ],
      rows
    );
    return csvResponse(`fpa_xreoseis_${stamp}.csv`, csv);
  }

  if (type === "customers") {
    const customers = await prisma.customer.findMany({
      include: { charges: { include: { receipts: true } } },
      orderBy: { name: "asc" },
    });
    const rows = customers.map((c) => {
      const agg = aggregateCustomer(c, now);
      return [
        c.name,
        c.contactPerson,
        c.email,
        c.phone,
        c.vatNumber,
        c.pms,
        c.status,
        centsToGreekNumber(agg.agreed),
        centsToGreekNumber(agg.paid),
        centsToGreekNumber(agg.outstanding),
        centsToGreekNumber(agg.overdue),
      ];
    });
    const csv = toCsv(
      [
        "Πελάτης",
        "Υπεύθυνος",
        "Email",
        "Τηλέφωνο",
        "ΑΦΜ",
        "PMS",
        "Κατάσταση",
        "Συμφωνηθέν",
        "Εισπραγμένα",
        "Υπόλοιπο",
        "Ληξιπρόθεσμα",
      ],
      rows
    );
    return csvResponse(`pelates_${stamp}.csv`, csv);
  }

  return new Response("Unknown export type", { status: 400 });
}
