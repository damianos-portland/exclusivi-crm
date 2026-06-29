import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { addTask, deleteTask } from "@/app/actions";
import { FormModal } from "@/components/FormModal";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TaskToggle } from "@/components/TaskToggle";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, customers] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      include: { customer: true },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-[var(--muted)]">{open.length} open</p>
        </div>
        <FormModal trigger="+ New task" title="New task" action={addTask}>
          <div>
            <label className="label">Title *</label>
            <input name="title" required className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client</label>
              <select name="customerId" className="input">
                <option value="">— None —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due date</label>
              <input name="dueDate" type="date" className="input" />
            </div>
          </div>
        </FormModal>
      </div>

      <div className="card divide-y">
        {open.map((t) => {
          const overdue = t.dueDate && new Date(t.dueDate) < now;
          return (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3">
              <TaskToggle id={t.id} done={t.done} />
              <div className="flex-1">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-[var(--muted)]">
                  {t.customer && (
                    <Link href={`/customers/${t.customer.id}`} className="hover:underline">
                      {t.customer.name}
                    </Link>
                  )}
                  {t.customer && t.dueDate && " · "}
                  {t.dueDate && (
                    <span className={overdue ? "text-red-600" : ""}>{formatDate(t.dueDate)}</span>
                  )}
                </div>
              </div>
              <ConfirmButton
                action={deleteTask.bind(null, t.id)}
                message="Delete?"
                className="text-xs text-red-500 hover:underline"
              >
                ✕
              </ConfirmButton>
            </div>
          );
        })}
        {open.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">No open tasks 🎉</p>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">Completed</h2>
          <div className="card divide-y opacity-70">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <TaskToggle id={t.id} done={t.done} />
                <div className="flex-1 text-sm line-through">{t.title}</div>
                <ConfirmButton
                  action={deleteTask.bind(null, t.id)}
                  message="Delete?"
                  className="text-xs text-red-500 hover:underline"
                >
                  ✕
                </ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
