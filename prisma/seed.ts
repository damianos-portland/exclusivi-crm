import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(12, 0, 0, 0);
  return d;
};

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

  // ── Senders ────────────────────────────────────────────────────
  if ((await prisma.sender.count()) === 0) {
    await prisma.sender.createMany({
      data: [
        {
          label: "Λογιστήριο",
          fromName: "Exclusivi — Λογιστήριο",
          fromEmail: "accounts@exclusivi.gr",
          isDefault: true,
        },
        {
          label: "Διοίκηση",
          fromName: "Exclusivi",
          fromEmail: "info@exclusivi.gr",
          isDefault: false,
        },
      ],
    });
    console.log("✓ Senders");
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

  // ── Δείγμα πελατών (μόνο αν είναι κενή η βάση) ──────────────────
  if ((await prisma.customer.count()) === 0) {
    const c1 = await prisma.customer.create({
      data: {
        name: "Καφέ Ακρόπολις ΕΠΕ",
        contactPerson: "Γιώργος Παπαδόπουλος",
        email: "info@akropolis-cafe.gr",
        phone: "+30 210 1234567",
        vatNumber: "094123456",
        status: "ACTIVE",
        charges: {
          create: {
            title: "Πακέτο Social Media — Q1 2026",
            amount: 120000, // 1.200,00 € καθαρά
            vatRate: 24,
            dueDate: day(-10),
            receipts: { create: { amount: 50000, method: "Τραπεζική" } },
          },
        },
      },
    });
    const c2 = await prisma.customer.create({
      data: {
        name: "Glow Beauty Studio",
        contactPerson: "Μαρία Ιωάννου",
        email: "hello@glowstudio.gr",
        phone: "+30 211 9876543",
        vatNumber: "099987654",
        status: "ACTIVE",
        charges: {
          create: {
            title: "Κατασκευή website",
            amount: 250000,
            vatRate: 24,
            dueDate: day(20),
          },
        },
      },
    });
    await prisma.customer.create({
      data: {
        name: "TechNova Solutions",
        contactPerson: "Νίκος Δημητρίου",
        email: "accounts@technova.gr",
        phone: "+30 210 5556677",
        vatNumber: "800111222",
        status: "ACTIVE",
        charges: {
          create: {
            title: "Συμβόλαιο συντήρησης 2026",
            amount: 360000,
            vatRate: 24,
            dueDate: day(-2),
            receipts: { create: { amount: 446400, method: "Τραπεζική" } },
          },
        },
      },
    });
    await prisma.activity.createMany({
      data: [
        { customerId: c1.id, type: "NOTE", body: "Ενδιαφέρον για επέκταση σε Google Ads." },
        { customerId: c2.id, type: "NOTE", body: "Ζήτησε προσφορά για λογότυπο." },
      ],
    });
    await prisma.task.create({
      data: { customerId: c1.id, title: "Follow-up για υπόλοιπο πληρωμής", dueDate: day(2) },
    });
    console.log("✓ Δείγμα πελατών");
  }

  console.log("\n✅ Seed ολοκληρώθηκε.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
