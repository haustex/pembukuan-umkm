import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { transactions } from "./db/schema";
import { currentYear } from "./format";

/** Daftar tahun yang punya transaksi + tahun berjalan, terbaru dulu. */
export async function availableYears() {
  const rows = await db
    .selectDistinct({ y: sql<number>`extract(year from ${transactions.date})::int` })
    .from(transactions);
  const set = new Set<number>([currentYear(), ...rows.map((r) => r.y)]);
  return [...set].sort((a, b) => b - a);
}

export function parseYear(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : currentYear();
}
