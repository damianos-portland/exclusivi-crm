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
          <h1 className="text-2xl font-semibold">Senders</h1>
          <p className="text-sm text-[var(--muted)]">
            “From” addresses you can choose when sending email
          </p>
        </div>
        <FormModal trigger="+ New sender" title="New sender" action={saveSender}>
          <SenderFields />
        </FormModal>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Label</th>
              <th className="th">Name</th>
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
                    <span className="ml-2 badge bg-indigo-50 text-indigo-600">default</span>
                  )}
                </td>
                <td className="td">{s.fromName}</td>
                <td className="td text-[var(--muted)]">{s.fromEmail}</td>
                <td className="td">
                  <div className="flex justify-end gap-2">
                    {!s.isDefault && (
                      <form action={setDefaultSender.bind(null, s.id)}>
                        <button className="btn-ghost btn-sm">Set default</button>
                      </form>
                    )}
                    <FormModal
                      trigger="Edit"
                      title="Edit sender"
                      action={saveSender}
                      triggerClassName="btn-ghost btn-sm"
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <SenderFields d={s} />
                    </FormModal>
                    <ConfirmButton action={deleteSender.bind(null, s.id)} message="Delete sender?">
                      ✕
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
            {senders.length === 0 && (
              <tr>
                <td colSpan={4} className="td py-8 text-center text-[var(--muted)]">
                  No senders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-4 text-xs text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Note:</strong> To send email via
        Gmail/Workspace, set <code>SMTP_USER</code> and <code>SMTP_PASS</code> (App Password) in{" "}
        <code>.env</code>. “From” addresses must be configured as “send-as” on the Google account.
      </div>
    </div>
  );
}

function SenderFields({ d }: { d?: { label: string; fromName: string; fromEmail: string } }) {
  return (
    <>
      <div>
        <label className="label">Label *</label>
        <input name="label" required defaultValue={d?.label ?? ""} placeholder="Accounting" className="input" />
      </div>
      <div>
        <label className="label">Display name *</label>
        <input
          name="fromName"
          required
          defaultValue={d?.fromName ?? ""}
          placeholder="Exclusivi"
          className="input"
        />
      </div>
      <div>
        <label className="label">Sender email *</label>
        <input
          name="fromEmail"
          type="email"
          required
          defaultValue={d?.fromEmail ?? ""}
          placeholder="bk@exclusivi.com"
          className="input"
        />
      </div>
    </>
  );
}
