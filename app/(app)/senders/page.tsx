import { prisma } from "@/lib/prisma";
import { saveSender, deleteSender, setDefaultSender } from "@/app/actions";
import { FormModal } from "@/components/FormModal";
import { ConfirmButton } from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function SendersPage() {
  const senders = await prisma.sender.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Αποστολείς</h1>
          <p className="text-sm text-[var(--muted)]">
            Διευθύνσεις «από» που μπορείς να διαλέξεις κατά την αποστολή email
          </p>
        </div>
        <FormModal trigger="+ Νέος αποστολέας" title="Νέος αποστολέας" action={saveSender}>
          <SenderFields />
        </FormModal>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Ετικέτα</th>
              <th className="th">Όνομα</th>
              <th className="th">Email</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {senders.map((s) => (
              <tr key={s.id}>
                <td className="td font-medium">
                  {s.label}
                  {s.isDefault && (
                    <span className="ml-2 badge bg-indigo-50 text-indigo-600">προεπιλογή</span>
                  )}
                </td>
                <td className="td">{s.fromName}</td>
                <td className="td text-[var(--muted)]">{s.fromEmail}</td>
                <td className="td">
                  <div className="flex justify-end gap-2">
                    {!s.isDefault && (
                      <form action={setDefaultSender.bind(null, s.id)}>
                        <button className="btn-ghost btn-sm">Ορισμός προεπιλογής</button>
                      </form>
                    )}
                    <FormModal
                      trigger="Επεξεργασία"
                      title="Επεξεργασία αποστολέα"
                      action={saveSender}
                      triggerClassName="btn-ghost btn-sm"
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <SenderFields d={s} />
                    </FormModal>
                    <ConfirmButton
                      action={deleteSender.bind(null, s.id)}
                      message="Διαγραφή αποστολέα;"
                    >
                      ✕
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
            {senders.length === 0 && (
              <tr>
                <td colSpan={4} className="td py-8 text-center text-[var(--muted)]">
                  Δεν υπάρχουν αποστολείς.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-4 text-xs text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Σημείωση:</strong> Για να φεύγουν τα email
        μέσω Gmail/Workspace, όρισε στο <code>.env</code> τα <code>SMTP_USER</code> και{" "}
        <code>SMTP_PASS</code> (App Password). Οι διευθύνσεις «από» πρέπει να είναι ρυθμισμένες ως
        «send-as» στον λογαριασμό Google.
      </div>
    </div>
  );
}

function SenderFields({
  d,
}: {
  d?: { label: string; fromName: string; fromEmail: string };
}) {
  return (
    <>
      <div>
        <label className="label">Ετικέτα *</label>
        <input name="label" required defaultValue={d?.label ?? ""} placeholder="Λογιστήριο" className="input" />
      </div>
      <div>
        <label className="label">Εμφανιζόμενο όνομα *</label>
        <input name="fromName" required defaultValue={d?.fromName ?? ""} placeholder="Exclusivi — Λογιστήριο" className="input" />
      </div>
      <div>
        <label className="label">Email αποστολέα *</label>
        <input name="fromEmail" type="email" required defaultValue={d?.fromEmail ?? ""} placeholder="accounts@exclusivi.gr" className="input" />
      </div>
    </>
  );
}
