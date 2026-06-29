import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "exclusivi_session";
const ALG = "HS256";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET δεν έχει οριστεί (ή είναι πολύ μικρό).");
  }
  return new TextEncoder().encode(s);
}

// ── Password hashing (scrypt, χωρίς εξωτερικά deps) ────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = deriveKey(password, salt);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = deriveKey(password, salt);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 64);
}

// ── Session JWT ───────────────────────────────────────────────────
export type SessionPayload = { userId: string; email: string; name: string };

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Χρήση σε protected pages/actions· κάνει redirect στο /login αν δεν υπάρχει session. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const SESSION_COOKIE = COOKIE_NAME;
