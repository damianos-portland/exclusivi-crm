"use client";

import { useState, useTransition, type ReactNode } from "react";

type Props = {
  trigger: ReactNode;
  title: string;
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
  submitLabel?: string;
  triggerClassName?: string;
};

export function FormModal({
  trigger,
  title,
  action,
  children,
  submitLabel = "Save",
  triggerClassName = "btn-primary btn-sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      try {
        await action(fd);
        setOpen(false);
      } catch (err) {
        // Τα redirects από server actions χειρίζονται αυτόματα· εδώ πιάνουμε πραγματικά σφάλματα.
        if (err && typeof err === "object" && "digest" in err) {
          const digest = String((err as { digest?: string }).digest);
          if (digest.startsWith("NEXT_REDIRECT")) return;
        }
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form onSubmit={handleSubmit} className="card w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Κλείσιμο"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">{children}</div>
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button type="submit" disabled={pending} className="btn-primary btn-sm">
                {pending ? "…" : submitLabel}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
