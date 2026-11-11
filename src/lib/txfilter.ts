import type { TxFilter } from "./report";
import { parseYear } from "./years";

export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function filterFromParams(sp: SP): { filter: TxFilter; year: number; month: number } {
  const year = parseYear(sp.tahun);
  const month = Math.min(12, Math.max(0, Number(one(sp.bulan)) || 0));
  const from = month ? `${year}-${String(month).padStart(2, "0")}-01` : `${year}-01-01`;
  const to = month ? new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) : `${year}-12-31`;
  const dir = one(sp.jenis);
  return {
    year,
    month,
    filter: {
      from,
      to,
      categoryId: Number(one(sp.kategori)) || undefined,
      accountId: Number(one(sp.akun)) || undefined,
      direction: dir === "in" || dir === "out" ? dir : undefined,
      q: one(sp.q).trim() || undefined,
    },
  };
}

