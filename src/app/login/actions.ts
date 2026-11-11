"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, destroySession, loginFailed, loginLimited, loginOk } from "@/lib/auth";

export type LoginState = { error?: string; email?: string };

// hash dummy supaya waktu respon sama saat email tidak ada
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("tidak-ada-user-ini", 12));

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email dan password wajib diisi.", email };

  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${email}`;
  if (loginLimited(key)) return { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi.", email };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? getDummyHash());
  if (!user || !ok || !user.active) {
    loginFailed(key);
    return { error: !user || !ok ? "Email atau password salah." : "Akun ini dinonaktifkan.", email };
  }

  loginOk(key);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
