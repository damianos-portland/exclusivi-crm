# Exclusivi CRM

Εσωτερικό CRM για εποπτεία πελατών & έλεγχο πληρωμών. Ένας χρήστης (ο CEO),
αποστολή email μέσω Gmail/Workspace, manual παρακολούθηση πληρωμών.

## Τι κάνει

- **Επισκόπηση (dashboard)** — KPIs: αναμενόμενα, ληξιπρόθεσμα, εισπράξεις μήνα, συνολικά εισπραγμένα· λίστα «χρειάζονται προσοχή».
- **Πελάτες** — στοιχεία, επικοινωνία, ΑΦΜ, κατάσταση (Lead/Ενεργός/Ανενεργός), αναζήτηση.
- **Πληρωμές** — συμφωνηθέν ποσό + ΦΠΑ, due date με αυτόματο flag «ληξιπρόθεσμο», ledger εισπράξεων ανά χρέωση, κατάσταση (Εκκρεμεί/Μερική/Εξοφλημένο/Ληξιπρόθεσμο).
- **Email** — templates με μεταβλητές (`{{name}}`, `{{amount}}`, `{{due}}`…), επιλογή αποστολέα & περιεχομένου, log απεσταλμένων.
- **Αυτόματες υπενθυμίσεις** — cron που στέλνει υπενθύμιση για ληξιπρόθεσμα (μία φορά/εβδομάδα ανά πελάτη).
- **Εκκρεμότητες & timeline** — follow-up tasks και ιστορικό/σημειώσεις ανά πελάτη.

## Τοπική εκτέλεση

```bash
npm install
cp .env.example .env      # συμπλήρωσε τις τιμές
npm run seed              # δημιουργεί τον χρήστη + δείγμα δεδομένων
npm run dev
```

Άνοιξε http://localhost:3000 και σύνδεση με τα στοιχεία του `.env`
(`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default: `ceo@exclusivi.gr` / `exclusivi2026`).

## Αποστολή email (Gmail / Workspace)

1. Ενεργοποίησε 2FA στον λογαριασμό Google.
2. Δημιούργησε **App Password**: https://myaccount.google.com/apppasswords
3. Βάλε στο `.env`: `SMTP_USER` (το email) και `SMTP_PASS` (το 16-ψήφιο app password).
4. Πρόσθεσε τους αποστολείς στη σελίδα **Αποστολείς** (πρέπει να είναι ρυθμισμένοι ως «send-as» στο Gmail).

## Deploy στο Vercel (δωρεάν)

1. **Βάση**: φτιάξε δωρεάν Postgres στο [Neon](https://neon.tech). Άλλαξε στο
   `prisma/schema.prisma` το `provider = "sqlite"` → `"postgresql"` και βάλε το
   `DATABASE_URL` του Neon στα env vars του Vercel.
2. Τρέξε `npx prisma migrate deploy` (ή το πρώτο deploy το κάνει το build).
3. Όρισε τα env vars στο Vercel: `AUTH_SECRET`, `DATABASE_URL`, `SMTP_*`, `CRON_SECRET`.
4. Το `vercel.json` έχει ήδη ρυθμισμένο cron (κάθε μέρα 09:00) για τις υπενθυμίσεις.
5. Μετά το πρώτο deploy, τρέξε το seed μία φορά για τον χρήστη.

## Cron υπενθυμίσεων (χειροκίνητη δοκιμή)

```
GET /api/cron/reminders?key=<CRON_SECRET>
```

## Stack

Next.js 16 (App Router) · Prisma · SQLite (τοπικά) / Postgres (prod) · Tailwind v4 · nodemailer · jose (session).
