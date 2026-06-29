"use client";

import { useTransition } from "react";
import { toggleTask } from "@/app/actions";

export function TaskToggle({ id, done }: { id: string; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <input
      type="checkbox"
      checked={done}
      disabled={pending}
      onChange={(e) => start(() => toggleTask(id, e.target.checked))}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--accent)]"
    />
  );
}
