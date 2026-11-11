"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, categories, transactions } from "@/lib/db/schema";
import { assertRole } from "@/lib/auth";
import { parseRupiah } from "@/lib/format";

export type TxState = { ok?: boolean; error?: string; savedAt?: number };

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const base = {
  date: z.string().regex(dateRe, "Tanggal tidak valid"),
  description: z.string().trim().min(1, "Keterangan wajib diisi").max(300),
  amount: z.number().int().positive("Nominal harus lebih dari 0").max(1e14, "Nominal terlalu besar"),
  ref: z.string().trim().max(100),
  note: z.string().trim().max(1000),
};

const txSchema = z.object({
  ...base,
  direction: z.enum(["in", "out"]),
  categoryId: z.number().int().positive("Pilih kategori"),
  accountId: z.number().int().positive("Pilih akun"),
});

const transferSchema = z.object({
  ...base,
  fromAccountId: z.number().int().positive("Pilih akun asal"),
  toAccountId: z.number().int().positive("Pilih akun tujuan"),
});

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "");
}

export async function saveTransaction(_: TxState, fd: FormData): Promise<TxState> {
  try {
    const user = await assertRole(["owner", "staff"]);
    const mode = str(fd, "mode");
    const id = Number(fd.get("id") || 0);
    const common = {
      date: str(fd, "date"),
      description: str(fd, "description"),
      amount: parseRupiah(str(fd, "amount")),
      ref: str(fd, "ref"),
      note: str(fd, "note"),
    };

    if (mode === "transfer" && !id) {
      const p = transferSchema.safeParse({
        ...common,
        fromAccountId: Number(fd.get("fromAccountId")),
        toAccountId: Number(fd.get("toAccountId")),
      });
      if (!p.success) return { error: p.error.issues[0].message };
      if (p.data.fromAccountId === p.data.toAccountId) return { error: "Akun asal dan tujuan tidak boleh sama." };
      const [cat] = await db.select().from(categories).where(eq(categories.group, "transfer")).limit(1);
      if (!cat) return { error: "Kategori transfer belum ada. Tambahkan di Pengaturan." };
      const { fromAccountId, toAccountId, ...rest } = p.data;
      await db.insert(transactions).values([
        { ...rest, categoryId: cat.id, accountId: fromAccountId, direction: "out", createdBy: user.id, updatedBy: user.id },
        { ...rest, categoryId: cat.id, accountId: toAccountId, direction: "in", createdBy: user.id, updatedBy: user.id },
      ]);
    } else {
      const p = txSchema.safeParse({
        ...common,
        direction: mode === "in" ? "in" : "out",
        categoryId: Number(fd.get("categoryId")),
        accountId: Number(fd.get("accountId")),
      });
      if (!p.success) return { error: p.error.issues[0].message };
      const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, p.data.categoryId));
      const [acc] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, p.data.accountId));
      if (!cat || !acc) return { error: "Kategori atau akun tidak ditemukan." };

      if (id) {
        const res = await db
          .update(transactions)
          .set({ ...p.data, updatedBy: user.id, updatedAt: new Date() })
          .where(eq(transactions.id, id))
          .returning({ id: transactions.id });
        if (!res.length) return { error: "Transaksi tidak ditemukan." };
      } else {
        await db.insert(transactions).values({ ...p.data, createdBy: user.id, updatedBy: user.id });
      }
    }
    revalidatePath("/", "layout");
    return { ok: true, savedAt: Date.now() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
}

export async function deleteTransaction(id: number): Promise<TxState> {
  try {
    await assertRole(["owner"]);
    await db.delete(transactions).where(and(eq(transactions.id, id)));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menghapus." };
  }
}
