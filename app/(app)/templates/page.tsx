import { prisma } from "@/lib/prisma";
import { saveTemplate, deleteTemplate } from "@/app/actions";
import { FormModal } from "@/components/FormModal";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TEMPLATE_VARIABLES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email templates</h1>
          <p className="text-sm text-[var(--muted)]">
            Ready-made messages with variables that auto-fill per client
          </p>
        </div>
        <FormModal trigger="+ New template" title="New template" action={saveTemplate}>
          <TemplateFields />
        </FormModal>
      </div>

      <VariableHelp />

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-xs text-[var(--muted)]">{t.subject}</p>
              </div>
              <div className="flex gap-2">
                <FormModal
                  trigger="Edit"
                  title="Edit template"
                  action={saveTemplate}
                  triggerClassName="btn-ghost btn-sm"
                >
                  <input type="hidden" name="id" value={t.id} />
                  <TemplateFields d={t} />
                </FormModal>
                <ConfirmButton action={deleteTemplate.bind(null, t.id)} message="Delete template?">
                  ✕
                </ConfirmButton>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {t.body}
            </pre>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No templates yet.</p>
        )}
      </div>
    </div>
  );
}

function VariableHelp() {
  return (
    <div className="card p-4">
      <p className="mb-2 text-xs font-medium text-[var(--muted)]">
        Available variables (wrap them in double braces):
      </p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_VARIABLES.map((v) => (
          <code
            key={v.key}
            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
            title={v.label}
          >
            {`{{${v.key}}}`}
          </code>
        ))}
      </div>
    </div>
  );
}

function TemplateFields({ d }: { d?: { name: string; subject: string; body: string } }) {
  return (
    <>
      <div>
        <label className="label">Template name *</label>
        <input name="name" required defaultValue={d?.name ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Email subject *</label>
        <input name="subject" required defaultValue={d?.subject ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea
          name="body"
          rows={9}
          defaultValue={d?.body ?? ""}
          className="input font-mono text-[13px]"
          placeholder="Dear {{contact}}, …"
        />
      </div>
    </>
  );
}
