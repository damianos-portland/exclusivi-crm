"use client";

import { useActionState, useEffect, useState } from "react";
import { sendCustomerEmail } from "@/app/actions";
import { renderTemplate, type TemplateVars } from "@/lib/templates";

type Template = { id: string; name: string; subject: string; body: string };
type Sender = { id: string; label: string; fromName: string; fromEmail: string; isDefault: boolean };

export function EmailComposer({
  customerId,
  to,
  senders,
  templates,
  vars,
}: {
  customerId: string;
  to: string;
  senders: Sender[];
  templates: Template[];
  vars: TemplateVars;
}) {
  const [state, action, pending] = useActionState(sendCustomerEmail, undefined);
  const defaultSender = senders.find((s) => s.isDefault) ?? senders[0];
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) {
      setSubject("");
      setBody("");
      return;
    }
    setSubject(renderTemplate(t.subject, vars));
    setBody(renderTemplate(t.body, vars));
  }

  // Καθάρισμα φόρμας μετά από επιτυχή αποστολή
  useEffect(() => {
    if (state?.ok) {
      setSubject("");
      setBody("");
    }
  }, [state?.ok]);

  if (senders.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No senders yet. Add one on the{" "}
        <a href="/senders" className="text-[var(--accent)]">
          Senders
        </a>{" "}
        page.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sender</label>
          <select name="senderId" defaultValue={defaultSender?.id} className="input">
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.fromEmail}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Template</label>
          <select
            defaultValue=""
            className="input"
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">— Blank —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">To</label>
        <input name="to" type="email" defaultValue={to} required className="input" />
      </div>
      <div>
        <label className="label">Subject</label>
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label">Message</label>
        <textarea
          name="body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input font-mono text-[13px]"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Email sent.
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? "Sending…" : "Send email"}
        </button>
      </div>
    </form>
  );
}
