"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { assertRole } from "@/lib/auth";

type S = { ok?: boolean; error?: string; at?: number };

export async function changePassword(_: S, fd: FormData): Promise<S> {
  try {
    const me = await assertRole(["owner", "staff", "viewer"]);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (next.length < 10) throw new Error("Password baru minimal 10 karakter");
    if (next !== confirm) throw new Error("Konfirmasi password tidak sama");
    const [u] = await db.select().from(users).where(eq(users.id, me.id));
    if (!u || !(await bcrypt.compare(current, u.passwordHash))) throw new Error("Password lama salah");
    await db.update(users).set({ passwordHash: await bcrypt.hash(next, 12) }).where(eq(users.id, me.id));
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal", at: Date.now() };
  }
}
