"use client";

import { useTransition } from "react";

export function ConfirmButton({
  action,
  message = "Είσαι σίγουρος;",
  children,
  className = "btn-danger btn-sm",
}: {
  action: () => Promise<void>;
  message?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirm(message)) start(() => action());
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
