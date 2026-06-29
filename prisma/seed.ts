import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function main() {
  // ── Χρήστης (CEO) ──────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL || "ceo@exclusivi.gr";
  await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.ADMIN_NAME || "Exclusivi CEO",
      password: hashPassword(process.env.ADMIN_PASSWORD || "exclusivi2026"),
    },
    create: {
      email,
      name: process.env.ADMIN_NAME || "Exclusivi CEO",
      password: hashPassword(process.env.ADMIN_PASSWORD || "exclusivi2026"),
    },
  });
  console.log("✓ Χρήστης:", email);

  // ── Sender ─────────────────────────────────────────────────────
  if ((await prisma.sender.count()) === 0) {
    await prisma.sender.create({
      data: {
        label: "Exclusivi",
        fromName: "Exclusivi",
        fromEmail: "bk@exclusivi.com",
        isDefault: true,
      },
    });
    console.log("✓ Sender");
  }

  // ── Templates ──────────────────────────────────────────────────
  if ((await prisma.emailTemplate.count()) === 0) {
    await prisma.emailTemplate.createMany({
      data: [
        {
          name: "Payment reminder",
          subject: "Payment reminder — Exclusivi",
          body:
            "Dear {{contact}},\n\nThis is a friendly reminder that there is an outstanding balance of {{amount}} for {{name}}, due on {{due}}.\n\nPlease arrange settlement at your earliest convenience.\n\nBest regards,\nExclusivi",
        },
        {
          name: "Payment received — thank you",
          subject: "We received your payment — thank you!",
          body:
            "Dear {{contact}},\n\nWe have received your payment. Thank you for your business!\n\nBest regards,\nExclusivi",
        },
        {
          name: "New client welcome",
          subject: "Welcome to Exclusivi",
          body:
            "Dear {{contact}},\n\nWelcome aboard! We're here for anything you need.\n\nBest regards,\nExclusivi",
        },
      ],
    });
    console.log("✓ Templates");
  }

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
