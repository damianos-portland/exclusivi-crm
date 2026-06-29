import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-[var(--surface)] p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] font-bold text-white">
            E
          </span>
          <span className="font-semibold">Exclusivi CRM</span>
        </Link>
        <NavLinks />
        <div className="mt-auto border-t pt-4">
          <div className="mb-2 px-2 text-xs text-[var(--muted)]">
            <div className="font-medium text-[var(--foreground)]">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
          <form action={logout}>
            <button className="btn-ghost btn-sm w-full">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
