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
          name: "Υπενθύμιση πληρωμής",
          subject: "Υπενθύμιση οφειλής — Exclusivi",
          body:
            "Αγαπητέ/ή {{contact}},\n\nΣας υπενθυμίζουμε ότι υπάρχει εκκρεμές υπόλοιπο ποσού {{amount}} για την επιχείρηση {{name}}, με ημερομηνία λήξης {{due}}.\n\nΠαρακαλούμε για την τακτοποίησή του.\n\nΜε εκτίμηση,\nExclusivi",
        },
        {
          name: "Ευχαριστήριο εξόφλησης",
          subject: "Λάβαμε την πληρωμή σας — ευχαριστούμε!",
          body:
            "Αγαπητέ/ή {{contact}},\n\nΛάβαμε την πληρωμή σας. Ευχαριστούμε για τη συνεργασία!\n\nΜε εκτίμηση,\nExclusivi",
        },
        {
          name: "Καλωσόρισμα νέου πελάτη",
          subject: "Καλωσήρθατε στην Exclusivi",
          body:
            "Αγαπητέ/ή {{contact}},\n\nΚαλωσήρθατε! Είμαστε στη διάθεσή σας για ό,τι χρειαστείτε.\n\nΜε εκτίμηση,\nExclusivi",
        },
      ],
    });
    console.log("✓ Templates");
  }

  console.log("\n✅ Seed ολοκληρώθηκε.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
