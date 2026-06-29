import "server-only";
import { ImapFlow } from "imapflow";
import { prisma } from "./prisma";

// Polls the Gmail inbox via IMAP and logs replies from known customers
// into their timeline (EmailLog kind=INBOUND + Activity). Best-effort:
// no-ops gracefully if IMAP credentials are not configured.
export async function pollInbound(): Promise<{
  skipped?: string;
  logged: number;
  scanned: number;
}> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass || pass.startsWith("your-")) {
    return { skipped: "IMAP credentials not configured", logged: 0, scanned: 0 };
  }
  const host = process.env.IMAP_HOST || "imap.gmail.com";

  // Map known customer emails → customer
  const customers = await prisma.customer.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true, name: true },
  });
  if (customers.length === 0) return { logged: 0, scanned: 0 };
  const byEmail = new Map(customers.map((c) => [c.email!.toLowerCase(), c]));

  // Cursor: scan messages newer than the latest inbound we logged, else last 14 days
  const latest = await prisma.emailLog.findFirst({
    where: { kind: "INBOUND" },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });
  const since = latest?.sentAt ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });

  let logged = 0;
  let scanned = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Envelope-only scan (light) — we don't download message bodies.
      const matches: {
        from: string;
        name: string;
        subject: string;
        date: Date;
        messageId: string;
        customerId: string;
      }[] = [];

      for await (const msg of client.fetch({ since }, { envelope: true })) {
        scanned++;
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
        if (!from) continue;
        const customer = byEmail.get(from);
        if (!customer) continue;
        matches.push({
          from,
          name: msg.envelope?.from?.[0]?.name || from,
          subject: msg.envelope?.subject || "(no subject)",
          date: msg.envelope?.date ?? new Date(),
          messageId: msg.envelope?.messageId ?? `imap-${msg.uid}`,
          customerId: customer.id,
        });
      }

      for (const m of matches) {
        const exists = await prisma.emailLog.findUnique({ where: { messageId: m.messageId } });
        if (exists) continue;
        await prisma.emailLog.create({
          data: {
            customerId: m.customerId,
            toEmail: user,
            fromEmail: m.from,
            fromName: m.name,
            subject: m.subject,
            body: "",
            status: "SENT",
            kind: "INBOUND",
            messageId: m.messageId,
            sentAt: m.date,
          },
        });
        await prisma.activity.create({
          data: { customerId: m.customerId, type: "EMAIL", body: `Reply received: ${m.subject}` },
        });
        logged++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { logged, scanned };
}
