"use client";

import { useTransition } from "react";
import { toggleRecurring } from "@/app/actions";

export function RecurringToggle({
  id,
  customerId,
  active,
}: {
  id: string;
  customerId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleRecurring(id, customerId, !active))}
      className="badge"
      style={
        active
          ? { backgroundColor: "#16a34a1a", color: "#16a34a" }
          : { backgroundColor: "#64748b1a", color: "#64748b" }
      }
      title="Toggle active"
    >
      {active ? "● Active" : "○ Paused"}
    </button>
  );
}
