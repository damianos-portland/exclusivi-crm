import { NextResponse, type NextRequest } from "next/server";

// Στο Next.js 16 το middleware μετονομάστηκε σε proxy (runtime: nodejs).
// Εδώ κάνουμε μόνο ελαφρύ έλεγχο ύπαρξης cookie· η πλήρης επαλήθευση
// του session γίνεται στις σελίδες μέσω requireUser().

const COOKIE_NAME = "exclusivi_session";
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Επίτρεψε static/api auth χωρίς έλεγχο.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(COOKIE_NAME);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
