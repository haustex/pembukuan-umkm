import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "./db";
import { sessions, users, type Role, type User } from "./db/schema";

export const SESSION_COOKIE = "lk_session";
const SESSION_DAYS = 14;

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hash(token), userId, expiresAt });
  // bersihkan session kedaluwarsa
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hash(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyUserSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = Pick<User, "id" | "name" | "email" | "role">;

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hash(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  return rows[0] ?? null;
});

/** Untuk halaman: redirect ke /login kalau belum login, ke / kalau role tidak cukup. */
export async function requireUser(roles?: Role[]) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

/** Untuk server action / route: lempar error, bukan redirect. */
export async function assertRole(roles: Role[]) {
  const user = await getUser();
  if (!user) throw new Error("Sesi habis, silakan login lagi.");
  if (!roles.includes(user.role)) throw new Error("Akses ditolak untuk role ini.");
  return user;
}

export const can = {
  write: (r: Role) => r === "owner" || r === "staff",
  delete: (r: Role) => r === "owner",
  admin: (r: Role) => r === "owner",
};

// --- rate limit login sederhana (in-memory, per instance) ---
const attempts = new Map<string, { n: number; until: number }>();
export function loginLimited(key: string) {
  const a = attempts.get(key);
  return !!a && a.n >= 5 && a.until > Date.now();
}
export function loginFailed(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) attempts.set(key, { n: 1, until: now + 15 * 60_000 });
  else a.n += 1;
}
export function loginOk(key: string) {
  attempts.delete(key);
}
