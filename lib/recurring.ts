import "server-only";
import { prisma } from "./prisma";
import { advanceInterval } from "./dates";

// Generates Charge rows from any RecurringCharge whose nextRunAt has passed,
// then advances the schedule. Idempotent per run (loops until caught up).
export async function runRecurring(now: Date = new Date()): Promise<{
  generated: number;
  details: { customer: string; title: string }[];
}> {
  const due = await prisma.recurringCharge.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    include: { customer: { select: { name: true } } },
  });

  const details: { customer: string; title: string }[] = [];

  for (const rc of due) {
    // Catch up if multiple periods elapsed (e.g. cron missed runs)
    let next = new Date(rc.nextRunAt);
    let guard = 0;
    while (next <= now && guard < 36) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + rc.dueDays);

      await prisma.charge.create({
        data: {
          customerId: rc.customerId,
          title: rc.title,
          amount: rc.amount,
          vatRate: rc.vatRate,
          currency: rc.currency,
          payLink: rc.payLink,
          dueDate,
        },
      });
      await prisma.activity.create({
        data: {
          customerId: rc.customerId,
          type: "STATUS",
          body: `Recurring charge generated: ${rc.title}`,
        },
      });
      details.push({ customer: rc.customer.name, title: rc.title });
      next = advanceInterval(next, rc.interval);
      guard++;
    }

    await prisma.recurringCharge.update({
      where: { id: rc.id },
      data: { nextRunAt: next, lastGeneratedAt: now },
    });
  }

  return { generated: details.length, details };
}
