"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/customers", label: "Clients", icon: "☺" },
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/exports", label: "Exports", icon: "↓" },
  { href: "/emails", label: "Email log", icon: "✉" },
  { href: "/templates", label: "Email templates", icon: "✎" },
  { href: "/senders", label: "Senders", icon: "↗" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--accent)] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="w-4 text-center opacity-80">{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
