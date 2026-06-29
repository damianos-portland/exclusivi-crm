"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

type ModalProps = {
  trigger: ReactNode;
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  triggerClassName?: string;
};

export function Modal({ trigger, title, children, triggerClassName }: ModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "btn-primary btn-sm"}
      >
        {trigger}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div ref={dialogRef} className="card w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{title}</h3>
              <button
                type="button"
                onClick={close}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Κλείσιμο"
              >
                ✕
              </button>
            </div>
            {typeof children === "function" ? children(close) : children}
          </div>
        </div>
      )}
    </>
  );
}
