"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { assertRole, destroyUserSessions } from "@/lib/auth";

type S = { ok?: boolean; error?: string; at?: number };
const fail = (e: unknown): S => ({
  error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Gagal.",
  at: Date.now(),
});
const ok = (): S => {
  revalidatePath("/pengguna");
  return { ok: true, at: Date.now() };
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const password = z.string().min(10, "Password minimal 10 karakter").max(200);

export async function createUser(_: S, fd: FormData): Promise<S> {
  try {
    await assertRole(["owner"]);
    const d = z
      .object({
        name: z.string().min(1, "Nama wajib diisi").max(100),
        email: z.email("Email tidak valid").transform((v) => v.toLowerCase()),
        role: z.enum(["owner", "staff", "viewer"]),
        password,
      })
      .parse({ name: str(fd, "name"), email: str(fd, "email"), role: str(fd, "role"), password: String(fd.get("password") ?? "") });
    await db.insert(users).values({ name: d.name, email: d.email, role: d.role, passwordHash: await bcrypt.hash(d.password, 12) });
    return ok();
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if (err?.code === "23505" || err?.cause?.code === "23505") return fail(new Error("Email sudah terdaftar"));
    return fail(e);
  }
}

async function otherActiveOwners(userId: number) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.active, true), ne(users.id, userId)));
  return n;
}

export async function updateUser(_: S, fd: FormData): Promise<S> {
  try {
    const me = await assertRole(["owner"]);
    const id = Number(fd.get("id"));
    const role = z.enum(["owner", "staff", "viewer"]).parse(str(fd, "role"));
    const active = fd.get("active") === "on";
    const name = z.string().min(1, "Nama wajib diisi").max(100).parse(str(fd, "name"));
    if ((role !== "owner" || !active) && (await otherActiveOwners(id)) === 0) {
      throw new Error("Harus ada minimal satu owner aktif.");
    }
    if (id === me.id && !active) throw new Error("Tidak bisa menonaktifkan akun sendiri.");
    await db.update(users).set({ name, role, active }).where(eq(users.id, id));
    if (!active) await destroyUserSessions(id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function resetPassword(_: S, fd: FormData): Promise<S> {
  try {
    await assertRole(["owner"]);
    const id = Number(fd.get("id"));
    const pw = password.parse(String(fd.get("password") ?? ""));
    await db.update(users).set({ passwordHash: await bcrypt.hash(pw, 12) }).where(eq(users.id, id));
    await destroyUserSessions(id);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
