import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/templates";
import { computeCharge } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { runRecurring } from "@/lib/recurring";
import { pollInbound } from "@/lib/inbound";

export const dynamic = "force-dynamic";

// Daily run (Vercel Cron). Does three things:
//   1. Generates due recurring charges
//   2. Sends payment reminders for overdue balances (max 1/week per customer)
//   3. Polls the inbox for client replies (IMAP) and logs them
// Protected by CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const key = req.nextUrl.searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1) Generate recurring charges first
  const recurring = await runRecurring(now);

  // 3) Poll inbound replies (best-effort; isolated from reminder failures)
  let inbound: Awaited<ReturnType<typeof pollInbound>> | { error: string };
  try {
    inbound = await pollInbound();
  } catch (e) {
    inbound = { error: e instanceof Error ? e.message : "inbound poll failed" };
  }

  const sender =
    (await prisma.sender.findFirst({ where: { isDefault: true } })) ??
    (await prisma.sender.findFirst());
  const template =
    (await prisma.emailTemplate.findFirst({ where: { name: { contains: "Reminder" } } })) ??
    (await prisma.emailTemplate.findFirst({ where: { name: { contains: "reminder" } } })) ??
    (await prisma.emailTemplate.findFirst({ where: { name: { contains: "Υπενθύμιση" } } }));

  if (!sender) {
    return NextResponse.json({
      ran: now.toISOString(),
      recurring,
      inbound,
      reminders: { skipped: "no sender configured" },
    });
  }

  const customers = await prisma.customer.findMany({
    where: { email: { not: null } },
    include: {
      charges: { include: { receipts: true } },
      emails: { where: { kind: "REMINDER", sentAt: { gte: weekAgo } }, take: 1 },
    },
  });

  const results: { customer: string; status: string }[] = [];

  for (const c of customers) {
    if (!c.email) continue;
    if (c.emails.length > 0) {
      results.push({ customer: c.name, status: "skipped (πρόσφατη υπενθύμιση)" });
      continue;
    }

    const overdue = c.charges
      .map((ch) => ({ ch, comp: computeCharge(ch, now) }))
      .filter((x) => x.comp.status === "OVERDUE");
    if (overdue.length === 0) continue;

    const outstanding = overdue.reduce((s, x) => s + x.comp.remaining, 0);
    const earliestDue = overdue
      .map((x) => x.ch.dueDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];

    const vars = {
      name: c.name,
      contact: c.contactPerson ?? c.name,
      amount: formatMoney(outstanding),
      total: formatMoney(outstanding),
      due: earliestDue ? formatDate(earliestDue) : "—",
      vat: c.vatNumber ?? "",
      today: formatDate(now),
    };

    const subject = template
      ? renderTemplate(template.subject, vars)
      : "Υπενθύμιση οφειλής — Exclusivi";
    const body = template
      ? renderTemplate(template.body, vars)
      : `Αγαπητέ/ή ${vars.contact},\n\nΥπάρχει εκκρεμές υπόλοιπο ${vars.amount}.\n\nExclusivi`;

    try {
      await sendEmail({ fromName: sender.fromName, fromEmail: sender.fromEmail, to: c.email, subject, body });
      await prisma.emailLog.create({
        data: {
          customerId: c.id,
          toEmail: c.email,
          fromEmail: sender.fromEmail,
          fromName: sender.fromName,
          subject,
          body,
          status: "SENT",
          kind: "REMINDER",
        },
      });
      await prisma.activity.create({
        data: { customerId: c.id, type: "EMAIL", body: `Automatic reminder: ${subject}` },
      });
      results.push({ customer: c.name, status: "sent" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "failed";
      await prisma.emailLog.create({
        data: {
          customerId: c.id,
          toEmail: c.email,
          fromEmail: sender.fromEmail,
          fromName: sender.fromName,
          subject,
          body,
          status: "FAILED",
          error: message,
          kind: "REMINDER",
        },
      });
      results.push({ customer: c.name, status: `failed: ${message}` });
    }
  }

  return NextResponse.json({
    ran: now.toISOString(),
    recurring,
    inbound,
    reminders: { count: results.length, results },
  });
}
