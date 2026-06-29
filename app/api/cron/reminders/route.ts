import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/templates";
import { computeCharge } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { runRecurring } from "@/lib/recurring";
import { pollInbound } from "@/lib/inbound";
import { stepForDays } from "@/lib/dunning";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow up to 60s for SMTP/IMAP work

// Time-box any promise so a stalled network op can never hang the function.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Daily run (Vercel Cron). Does three things:
//   1. Generates due recurring charges
//   2. Sends escalating payment reminders (dunning: gentle → firm → final)
//   3. Polls the inbox for client replies (IMAP) and logs them (time-boxed, last)
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

  // 1) Generate recurring charges first (DB-only, fast)
  const recurring = await runRecurring(now);

  const sender =
    (await prisma.sender.findFirst({ where: { isDefault: true } })) ??
    (await prisma.sender.findFirst());
  const allTemplates = await prisma.emailTemplate.findMany();
  const templateByName = new Map(allTemplates.map((t) => [t.name, t]));

  if (!sender) {
    const inbound = await runInbound();
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
      // last reminder sent, to decide escalation / weekly re-nudge
      emails: {
        where: { kind: "REMINDER", status: "SENT" },
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

  const results: { customer: string; status: string }[] = [];

  for (const c of customers) {
    if (!c.email) continue;

    const overdue = c.charges
      .map((ch) => ({ ch, comp: computeCharge(ch, now) }))
      .filter((x) => x.comp.status === "OVERDUE");
    if (overdue.length === 0) continue;

    const maxDays = Math.max(...overdue.map((x) => x.comp.daysOverdue));
    const step = stepForDays(maxDays);
    if (!step) continue;

    // Escalate immediately on step change; otherwise re-nudge at most weekly.
    const last = c.emails[0];
    if (last && last.step === step.key && last.sentAt >= weekAgo) {
      results.push({ customer: c.name, status: `skipped (${step.key} sent recently)` });
      continue;
    }

    const outstanding = overdue.reduce((s, x) => s + x.comp.remaining, 0);
    const earliestDue = overdue
      .map((x) => x.ch.dueDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];
    const payLink = overdue.map((x) => x.ch.payLink).find(Boolean) ?? "";

    const vars = {
      name: c.name,
      contact: c.contactPerson ?? c.name,
      amount: formatMoney(outstanding),
      total: formatMoney(outstanding),
      due: earliestDue ? formatDate(earliestDue) : "—",
      vat: c.vatNumber ?? "",
      paylink: payLink,
      today: formatDate(now),
    };

    const tpl = templateByName.get(step.templateName);
    const subject = renderTemplate(tpl?.subject ?? step.fallbackSubject, vars);
    const body = renderTemplate(tpl?.body ?? step.fallbackBody, vars);

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
          step: step.key,
        },
      });
      await prisma.activity.create({
        data: { customerId: c.id, type: "EMAIL", body: `Reminder (${step.key}): ${subject}` },
      });
      results.push({ customer: c.name, status: `sent (${step.key})` });
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
          step: step.key,
        },
      });
      results.push({ customer: c.name, status: `failed: ${message}` });
    }
  }

  // 3) Inbound poll last + time-boxed, so it can never block reminders
  const inbound = await runInbound();

  return NextResponse.json({
    ran: now.toISOString(),
    recurring,
    inbound,
    reminders: { count: results.length, results },
  });
}

async function runInbound() {
  try {
    return await withTimeout(pollInbound(), 25000, "inbound poll");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "inbound poll failed" };
  }
}
