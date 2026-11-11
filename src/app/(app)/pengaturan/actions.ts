"use server";

import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, categories, categoryGroupEnum, settings, transactions, yearlyAdjustments } from "@/lib/db/schema";
import { assertRole } from "@/lib/auth";
import { parseRupiah } from "@/lib/format";

export type FormState = { ok?: boolean; error?: string; at?: number };
const done = (): FormState => {
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
};
const fail = (e: unknown): FormState => ({ error: e instanceof Error ? e.message : "Gagal menyimpan.", at: Date.now() });
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** "0,5" / "0.5" → 50 basis point */
function pctToBp(v: string) {
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("Persentase tidak valid");
  return Math.round(n * 100);
}

export async function updateSettings(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await assertRole(["owner"]);
    const data = z
      .object({
        businessName: z.string().min(1, "Nama usaha wajib diisi").max(200),
        taxScheme: z.enum(["pt_umum", "pt_perorangan", "op"]),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai tidak valid"),
      })
      .parse({ businessName: s(fd, "businessName"), taxScheme: s(fd, "taxScheme"), startDate: s(fd, "startDate") });
    await db
      .update(settings)
      .set({
        ...data,
        finalRateBp: pctToBp(s(fd, "finalRate")),
        corpRateBp: pctToBp(s(fd, "corpRate")),
        opExemptAmount: parseRupiah(s(fd, "opExemptAmount")),
        facilityLimit: parseRupiah(s(fd, "facilityLimit")),
      })
      .where(eq(settings.id, 1));
    return done();
  } catch (e) {
    return fail(e instanceof z.ZodError ? new Error(e.issues[0].message) : e);
  }
}

export async function setDepreciation(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await assertRole(["owner"]);
    const year = Number(fd.get("year"));
    if (!Number.isInteger(year)) throw new Error("Tahun tidak valid");
    const depreciation = parseRupiah(s(fd, "depreciation"));
    await db
      .insert(yearlyAdjustments)
      .values({ year, depreciation })
      .onConflictDoUpdate({ target: yearlyAdjustments.year, set: { depreciation } });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function saveAccount(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await assertRole(["owner"]);
    const id = Number(fd.get("id") || 0);
    const name = s(fd, "name");
    if (!name) throw new Error("Nama akun wajib diisi");
    const values = {
      name,
      openingBalance: (s(fd, "openingBalance").startsWith("-") ? -1 : 1) * parseRupiah(s(fd, "openingBalance")),
      active: fd.get("active") === "on",
      sort: Number(fd.get("sort") || 0),
    };
    if (id) await db.update(accounts).set(values).where(eq(accounts.id, id));
    else await db.insert(accounts).values({ ...values, active: true });
    return done();
  } catch (e) {
    return fail(isUnique(e) ? new Error("Nama akun sudah dipakai") : e);
  }
}

export async function deleteAccount(id: number): Promise<FormState> {
  try {
    await assertRole(["owner"]);
    const [{ n }] = await db.select({ n: count() }).from(transactions).where(eq(transactions.accountId, id));
    if (n > 0) throw new Error(`Akun dipakai di ${n} transaksi. Nonaktifkan saja.`);
    await db.delete(accounts).where(eq(accounts.id, id));
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function saveCategory(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await assertRole(["owner"]);
    const id = Number(fd.get("id") || 0);
    const data = z
      .object({
        code: z.string().regex(/^\d-\d{2}$/, "Kode harus format 0-00, mis. 6-14"),
        name: z.string().min(1, "Nama kategori wajib diisi").max(120),
        group: z.enum(categoryGroupEnum.enumValues),
        description: z.string().max(300),
      })
      .parse({ code: s(fd, "code"), name: s(fd, "name"), group: s(fd, "group"), description: s(fd, "description") });
    const values = { ...data, finalTaxed: fd.get("finalTaxed") === "on", active: id ? fd.get("active") === "on" : true };
    if (id) await db.update(categories).set(values).where(eq(categories.id, id));
    else await db.insert(categories).values(values);
    return done();
  } catch (e) {
    if (e instanceof z.ZodError) return fail(new Error(e.issues[0].message));
    return fail(isUnique(e) ? new Error("Kode kategori sudah dipakai") : e);
  }
}

export async function deleteCategory(id: number): Promise<FormState> {
  try {
    await assertRole(["owner"]);
    const [{ n }] = await db.select({ n: count() }).from(transactions).where(eq(transactions.categoryId, id));
    if (n > 0) throw new Error(`Kategori dipakai di ${n} transaksi. Nonaktifkan saja.`);
    await db.delete(categories).where(eq(categories.id, id));
    return done();
  } catch (e) {
    return fail(e);
  }
}

function isUnique(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}
