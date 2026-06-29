import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, centsToInput } from "@/lib/money";
import { computeCharge, aggregateCustomer } from "@/lib/finance";
import { toDateInput, formatDate, formatDateTime, INTERVAL_LABELS } from "@/lib/dates";
import {
  updateCustomer,
  deleteCustomer,
  addCharge,
  updateCharge,
  deleteCharge,
  addPayment,
  deletePayment,
  addNote,
  addTask,
  saveRecurring,
  deleteRecurring,
} from "@/app/actions";
import { FormModal } from "@/components/FormModal";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CustomerFields } from "@/components/CustomerFields";
import { StatusBadge, CustomerStatusBadge } from "@/components/StatusBadge";
import { EmailComposer } from "@/components/EmailComposer";
import { RecurringToggle } from "@/components/RecurringToggle";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const now = new Date();

  const [customer, senders, templates] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        charges: {
          orderBy: { createdAt: "desc" },
          include: { receipts: { orderBy: { paidAt: "desc" } } },
        },
        recurring: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
        tasks: { orderBy: { dueDate: "asc" } },
      },
    }),
    prisma.sender.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!customer) notFound();

  const agg = aggregateCustomer(customer, now);

  const nextUnpaid = customer.charges.find((c) => computeCharge(c, now).status !== "PAID");
  const vars = {
    name: customer.name,
    contact: customer.contactPerson ?? customer.name,
    amount: formatMoney(agg.outstanding),
    total: formatMoney(agg.agreed),
    due: nextUnpaid?.dueDate ? formatDate(nextUnpaid.dueDate) : "—",
    vat: customer.vatNumber ?? "",
    paylink: nextUnpaid?.payLink ?? "",
    today: formatDate(now),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/customers" className="text-sm text-[var(--muted)] hover:underline">
          ← Clients
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{customer.name}</h1>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <div className="flex gap-2">
            <FormModal
              trigger="Edit"
              title="Edit client"
              action={updateCustomer.bind(null, customer.id)}
              triggerClassName="btn-ghost btn-sm"
            >
              <CustomerFields d={customer} />
            </FormModal>
            <ConfirmButton
              action={deleteCustomer.bind(null, customer.id)}
              message={`Delete client "${customer.name}" and all its data?`}
            >
              Delete
            </ConfirmButton>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <MiniKpi label="Agreed (incl. VAT)" value={formatMoney(agg.agreed)} />
        <MiniKpi label="Collected" value={formatMoney(agg.paid)} color="#16a34a" />
        <MiniKpi
          label="Outstanding"
          value={formatMoney(agg.outstanding)}
          color={agg.overdue > 0 ? "#dc2626" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: charges + recurring + timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Charges */}
          <div className="card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">Charges & payments</h2>
              <FormModal trigger="+ Charge" title="New charge" action={addCharge.bind(null, customer.id)}>
                <ChargeFields />
              </FormModal>
            </div>
            {customer.charges.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">No charges yet.</p>
            ) : (
              <div className="divide-y">
                {customer.charges.map((charge) => {
                  const comp = computeCharge(charge, now);
                  return (
                    <div key={charge.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{charge.title}</div>
                          <div className="text-xs text-[var(--muted)]">
                            Due: {formatDate(charge.dueDate)} · VAT {charge.vatRate}%
                            {comp.isOverdue && (
                              <span className="text-red-600"> · {comp.daysOverdue} days overdue</span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={comp.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-[var(--muted)]">Total</div>
                          <div className="font-medium">{formatMoney(comp.gross)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--muted)]">Collected</div>
                          <div className="font-medium text-green-600">{formatMoney(comp.paid)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--muted)]">Balance</div>
                          <div className="font-medium">{formatMoney(comp.remaining)}</div>
                        </div>
                      </div>

                      {charge.receipts.length > 0 && (
                        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
                          {charge.receipts.map((r) => (
                            <div key={r.id} className="flex items-center justify-between">
                              <span className="text-[var(--muted)]">
                                {formatDate(r.paidAt)} · {r.method ?? "—"}
                                {r.note ? ` · ${r.note}` : ""}
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="font-medium">{formatMoney(r.amount)}</span>
                                <ConfirmButton
                                  action={deletePayment.bind(null, r.id, customer.id)}
                                  message="Delete payment?"
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  ✕
                                </ConfirmButton>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {comp.remaining > 0 && (
                          <FormModal
                            trigger="+ Payment"
                            title={`Payment — ${charge.title}`}
                            action={addPayment.bind(null, charge.id, customer.id)}
                            triggerClassName="btn-primary btn-sm"
                          >
                            <PaymentFields remaining={comp.remaining} />
                          </FormModal>
                        )}
                        <FormModal
                          trigger="Edit"
                          title="Edit charge"
                          action={updateCharge.bind(null, charge.id, customer.id)}
                          triggerClassName="btn-ghost btn-sm"
                        >
                          <ChargeFields d={charge} />
                        </FormModal>
                        <Link
                          href={`/customers/${customer.id}/invoice/${charge.id}`}
                          className="btn-ghost btn-sm"
                        >
                          Invoice
                        </Link>
                        <ConfirmButton
                          action={deleteCharge.bind(null, charge.id, customer.id)}
                          message="Delete charge and its payments?"
                          className="btn-danger btn-sm"
                        >
                          Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recurring charges */}
          <div className="card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">Recurring charges</h2>
                <p className="text-xs text-[var(--muted)]">Auto-generated on schedule</p>
              </div>
              <FormModal
                trigger="+ Recurring"
                title="New recurring charge"
                action={saveRecurring.bind(null, customer.id)}
              >
                <RecurringFields />
              </FormModal>
            </div>
            {customer.recurring.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                No recurring charges.
              </p>
            ) : (
              <div className="divide-y">
                {customer.recurring.map((rc) => (
                  <div key={rc.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="font-medium">{rc.title}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {formatMoney(rc.amount)} + VAT {rc.vatRate}% ·{" "}
                        {INTERVAL_LABELS[rc.interval] ?? rc.interval} · next {formatDate(rc.nextRunAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RecurringToggle id={rc.id} customerId={customer.id} active={rc.active} />
                      <FormModal
                        trigger="Edit"
                        title="Edit recurring charge"
                        action={saveRecurring.bind(null, customer.id)}
                        triggerClassName="btn-ghost btn-sm"
                      >
                        <input type="hidden" name="id" value={rc.id} />
                        <RecurringFields d={rc} />
                      </FormModal>
                      <ConfirmButton
                        action={deleteRecurring.bind(null, rc.id, customer.id)}
                        message="Delete recurring charge?"
                        className="text-xs text-red-500 hover:underline"
                      >
                        ✕
                      </ConfirmButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">History & notes</h2>
            </div>
            <div className="p-5">
              <form action={addNote.bind(null, customer.id)} className="mb-4 flex gap-2">
                <input name="body" placeholder="Add a note…" className="input" required />
                <button className="btn-primary btn-sm shrink-0">Add</button>
              </form>
              {customer.activities.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No entries.</p>
              ) : (
                <ul className="space-y-3">
                  {customer.activities.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="mt-0.5 text-xs">{activityIcon(a.type)}</span>
                      <div>
                        <div>{a.body}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {formatDateTime(a.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right: contact, email, tasks */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Contact details</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Contact" value={customer.contactPerson} />
              <Info label="Email" value={customer.email} />
              <Info label="Phone" value={customer.phone} />
              <Info label="VAT number" value={customer.vatNumber} />
              <Info label="PMS" value={customer.pms} />
              <Info label="Address" value={customer.address} />
              {customer.notes && <Info label="Notes" value={customer.notes} />}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">✉ Send email</h2>
            <EmailComposer
              customerId={customer.id}
              to={customer.email ?? ""}
              senders={senders}
              templates={templates}
              vars={vars}
            />
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Tasks</h2>
              <FormModal
                trigger="+"
                title="New task"
                action={addTask}
                triggerClassName="btn-ghost btn-sm"
              >
                <input type="hidden" name="customerId" value={customer.id} />
                <div>
                  <label className="label">Title</label>
                  <input name="title" required className="input" />
                </div>
                <div>
                  <label className="label">Due date</label>
                  <input name="dueDate" type="date" className="input" />
                </div>
              </FormModal>
            </div>
            {customer.tasks.filter((t) => !t.done).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No open tasks.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {customer.tasks
                  .filter((t) => !t.done)
                  .map((t) => (
                    <li key={t.id} className="flex justify-between">
                      <span>{t.title}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {t.dueDate ? formatDate(t.dueDate) : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────
function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold" style={{ color: color ?? "inherit" }}>
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function ChargeFields({
  d,
}: {
  d?: { title: string; amount: number; vatRate: number; dueDate: Date | null; payLink: string | null };
}) {
  return (
    <>
      <div>
        <label className="label">Description *</label>
        <input name="title" required defaultValue={d?.title ?? ""} className="input" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Net amount (€) *</label>
          <input
            name="amount"
            required
            defaultValue={d ? centsToInput(d.amount) : ""}
            placeholder="1000.00"
            className="input"
          />
        </div>
        <div>
          <label className="label">VAT %</label>
          <input name="vatRate" type="number" defaultValue={d?.vatRate ?? 24} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Due date</label>
        <input name="dueDate" type="date" defaultValue={toDateInput(d?.dueDate)} className="input" />
      </div>
      <div>
        <label className="label">Payment link (optional)</label>
        <input
          name="payLink"
          defaultValue={d?.payLink ?? ""}
          placeholder="https://… (Stripe / Viva / bank link)"
          className="input"
        />
      </div>
    </>
  );
}

function PaymentFields({ remaining }: { remaining: number }) {
  return (
    <>
      <div>
        <label className="label">Payment amount (€) *</label>
        <input name="amount" required defaultValue={centsToInput(remaining)} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Method</label>
          <select name="method" className="input">
            <option value="Bank transfer">Bank transfer</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input name="paidAt" type="date" defaultValue={toDateInput(new Date())} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Note</label>
        <input name="note" className="input" />
      </div>
    </>
  );
}

function RecurringFields({
  d,
}: {
  d?: {
    title: string;
    amount: number;
    vatRate: number;
    interval: string;
    dueDays: number;
    payLink: string | null;
    nextRunAt: Date;
  };
}) {
  return (
    <>
      <div>
        <label className="label">Description *</label>
        <input name="title" required defaultValue={d?.title ?? ""} className="input" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Net amount (€) *</label>
          <input
            name="amount"
            required
            defaultValue={d ? centsToInput(d.amount) : ""}
            placeholder="1000.00"
            className="input"
          />
        </div>
        <div>
          <label className="label">VAT %</label>
          <input name="vatRate" type="number" defaultValue={d?.vatRate ?? 24} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Interval</label>
          <select name="interval" defaultValue={d?.interval ?? "MONTHLY"} className="input">
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div>
          <label className="label">Next run</label>
          <input
            name="nextRunAt"
            type="date"
            defaultValue={toDateInput(d?.nextRunAt ?? new Date())}
            className="input"
          />
        </div>
        <div>
          <label className="label">Due in (days)</label>
          <input name="dueDays" type="number" defaultValue={d?.dueDays ?? 14} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Payment link (optional)</label>
        <input name="payLink" defaultValue={d?.payLink ?? ""} placeholder="https://…" className="input" />
      </div>
    </>
  );
}

function activityIcon(type: string): string {
  switch (type) {
    case "PAYMENT":
      return "💶";
    case "EMAIL":
      return "✉";
    case "STATUS":
      return "•";
    default:
      return "📝";
  }
}
