import "server-only";
import { and, asc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  accounts,
  categories,
  settings as settingsTable,
  transactions,
  users,
  yearlyAdjustments,
  type CategoryGroup,
  type Settings,
} from "./db/schema";
import { MONTHS } from "./constants";

/** Kelompok yang dihitung "masuk − keluar" (sisanya "keluar − masuk"). */
const INCOME_LIKE: CategoryGroup[] = ["pendapatan", "lain", "pinjaman", "modal"];

export async function getSettings(): Promise<Settings> {
  const [s] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return s;
}

type Agg = { month: number; group: CategoryGroup; finalTaxed: boolean; inSum: number; outSum: number };

async function aggregateYear(year: number): Promise<Agg[]> {
  const rows = await db
    .select({
      month: sql<number>`extract(month from ${transactions.date})::int`,
      group: categories.group,
      finalTaxed: categories.finalTaxed,
      inSum: sql<number>`coalesce(sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else 0 end),0)::bigint`,
      outSum: sql<number>`coalesce(sum(case when ${transactions.direction} = 'out' then ${transactions.amount} else 0 end),0)::bigint`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(gte(transactions.date, `${year}-01-01`), lt(transactions.date, `${year + 1}-01-01`)))
    .groupBy(sql`1`, categories.group, categories.finalTaxed);
  return rows.map((r) => ({ ...r, inSum: Number(r.inSum), outSum: Number(r.outSum) }));
}

function net(rows: Agg[], filter: (r: Agg) => boolean, incomeLike: boolean) {
  return rows.filter(filter).reduce((s, r) => s + (incomeLike ? r.inSum - r.outSum : r.outSum - r.inSum), 0);
}

export type MonthRow = {
  month: number;
  label: string;
  omzet: number;
  cumulative: number;
  pphFinal: number;
  hpp: number;
  beban: number;
  lain: number;
  laba: number;
  dueDate: string;
};

export function computePphFinal(s: Settings, omzet: number, cumulative: number) {
  if (s.taxScheme === "pt_umum") return 0;
  const rate = s.finalRateBp / 10_000;
  if (s.taxScheme === "pt_perorangan") return Math.round(Math.max(0, omzet * rate));
  const prev = cumulative - omzet;
  const base = Math.max(0, cumulative - s.opExemptAmount) - Math.max(0, prev - s.opExemptAmount);
  return Math.round(Math.max(0, base * rate));
}

export function computePphBadan(s: Settings, omzet: number, pkp: number) {
  const rate = s.corpRateBp / 10_000;
  if (pkp <= 0) return 0;
  if (omzet <= s.facilityLimit) return Math.round(pkp * rate * 0.5);
  if (omzet <= 50_000_000_000) {
    const facilitated = (pkp * s.facilityLimit) / omzet;
    return Math.round(facilitated * rate * 0.5 + (pkp - facilitated) * rate);
  }
  return Math.round(pkp * rate);
}

export async function getYearReport(year: number) {
  const [s, agg, adj] = await Promise.all([
    getSettings(),
    aggregateYear(year),
    db.select().from(yearlyAdjustments).where(eq(yearlyAdjustments.year, year)),
  ]);
  const depreciation = adj[0]?.depreciation ?? 0;

  // --- Rekap bulanan ---
  let cumulative = 0;
  const months: MonthRow[] = MONTHS.map((label, i) => {
    const m = i + 1;
    const rows = agg.filter((r) => r.month === m);
    const omzet = net(rows, (r) => r.group === "pendapatan", true);
    const hpp = net(rows, (r) => r.group === "hpp", false);
    const beban = net(rows, (r) => r.group === "beban" || r.group === "beban_nd", false);
    const lain = net(rows, (r) => r.group === "lain", true);
    cumulative += omzet;
    const due = new Date(Date.UTC(year, m, 15)); // tgl 15 bulan berikutnya
    return {
      month: m,
      label,
      omzet,
      cumulative,
      pphFinal: computePphFinal(s, omzet, cumulative),
      hpp,
      beban,
      lain,
      laba: omzet - hpp - beban + lain,
      dueDate: due.toISOString().slice(0, 10),
    };
  });

  const sum = (k: keyof MonthRow) => months.reduce((a, r) => a + (r[k] as number), 0);

  // --- Laba rugi & pajak ---
  const omzet = sum("omzet");
  const hpp = sum("hpp");
  const labaKotor = omzet - hpp;
  const beban = sum("beban");
  const labaUsaha = labaKotor - beban - depreciation;
  const lain = sum("lain");
  const labaBersih = labaUsaha + lain;
  const koreksiPlus = net(agg, (r) => r.group === "beban_nd", false);
  const koreksiMinus = net(agg, (r) => r.group === "lain" && r.finalTaxed, true);
  const pkp = Math.max(0, Math.floor((labaBersih + koreksiPlus - koreksiMinus) / 1000) * 1000);
  const pphBadan = computePphBadan(s, omzet, pkp);
  const pphFinal = sum("pphFinal");
  const pphTerutang = s.taxScheme === "pt_umum" ? pphBadan : pphFinal;
  const pphDisetor = net(agg, (r) => r.group === "pajak", false);

  const pl = {
    omzet,
    hpp,
    labaKotor,
    beban,
    depreciation,
    labaUsaha,
    lain,
    labaBersih,
    koreksiPlus,
    koreksiMinus,
    pkp,
    pphBadan,
    pphFinal,
    pphTerutang,
    pphDisetor,
    kurangBayar: pphTerutang - pphDisetor,
    asetDibeli: net(agg, (r) => r.group === "aset", false),
    pinjamanNet: net(agg, (r) => r.group === "pinjaman", true),
    modalNet: net(agg, (r) => r.group === "modal", true),
  };

  const totals = {
    omzet,
    pphFinal,
    hpp,
    beban,
    lain,
    laba: sum("laba"),
  };

  return { year, settings: s, months, totals, pl };
}

export async function getCategoryReport(year: number) {
  const rows = await db
    .select({
      id: categories.id,
      code: categories.code,
      name: categories.name,
      group: categories.group,
      inSum: sql<number>`coalesce(sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else 0 end),0)::bigint`,
      outSum: sql<number>`coalesce(sum(case when ${transactions.direction} = 'out' then ${transactions.amount} else 0 end),0)::bigint`,
      n: sql<number>`count(${transactions.id})::int`,
    })
    .from(categories)
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, categories.id),
        gte(transactions.date, `${year}-01-01`),
        lt(transactions.date, `${year + 1}-01-01`),
      ),
    )
    .groupBy(categories.id)
    .orderBy(asc(categories.code));
  return rows.map((r) => {
    const inSum = Number(r.inSum);
    const outSum = Number(r.outSum);
    return { ...r, inSum, outSum, net: INCOME_LIKE.includes(r.group) ? inSum - outSum : outSum - inSum };
  });
}

/** Saldo per akun: saldo awal tahun & akhir tahun (sampai `until`). */
export async function getAccountBalances(year: number, until?: string) {
  const s = await getSettings();
  const start = `${year}-01-01`;
  const end = until ?? `${year}-12-31`;
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      active: accounts.active,
      opening: accounts.openingBalance,
      before: sql<number>`coalesce(sum(case when ${transactions.date} < ${start} then (case when ${transactions.direction}='in' then ${transactions.amount} else -${transactions.amount} end) else 0 end),0)::bigint`,
      inSum: sql<number>`coalesce(sum(case when ${transactions.date} >= ${start} and ${transactions.date} <= ${end} and ${transactions.direction}='in' then ${transactions.amount} else 0 end),0)::bigint`,
      outSum: sql<number>`coalesce(sum(case when ${transactions.date} >= ${start} and ${transactions.date} <= ${end} and ${transactions.direction}='out' then ${transactions.amount} else 0 end),0)::bigint`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .groupBy(accounts.id)
    .orderBy(asc(accounts.sort), asc(accounts.id));
  // Saldo awal akun berlaku sejak tanggal mulai pembukuan. Tahun yang berakhir
  // sebelum tanggal mulai tidak ikut membawa saldo awal itu.
  const openingApplies = s.startDate <= `${year}-12-31`;
  return rows.map((r) => {
    const saldoAwal = (openingApplies ? r.opening : 0) + Number(r.before);
    const inSum = Number(r.inSum);
    const outSum = Number(r.outSum);
    return { id: r.id, name: r.name, active: r.active, saldoAwal, inSum, outSum, saldoAkhir: saldoAwal + inSum - outSum };
  });
}

export type TxFilter = {
  from?: string;
  to?: string;
  categoryId?: number;
  accountId?: number;
  q?: string;
  direction?: "in" | "out";
};

export function txWhere(f: TxFilter) {
  const conds = [];
  if (f.from) conds.push(gte(transactions.date, f.from));
  if (f.to) conds.push(lte(transactions.date, f.to));
  if (f.categoryId) conds.push(eq(transactions.categoryId, f.categoryId));
  if (f.accountId) conds.push(eq(transactions.accountId, f.accountId));
  if (f.direction) conds.push(eq(transactions.direction, f.direction));
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "\\$&")}%`;
    conds.push(sql`(${transactions.description} ilike ${like} or ${transactions.ref} ilike ${like} or ${transactions.note} ilike ${like})`);
  }
  return conds.length ? and(...conds) : undefined;
}

export async function listTransactions(f: TxFilter, opts: { limit?: number; offset?: number } = {}) {
  const where = txWhere(f);
  const q = db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      direction: transactions.direction,
      amount: transactions.amount,
      ref: transactions.ref,
      note: transactions.note,
      categoryId: transactions.categoryId,
      accountId: transactions.accountId,
      categoryCode: categories.code,
      categoryName: categories.name,
      categoryGroup: categories.group,
      accountName: accounts.name,
      createdByName: users.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(users, eq(transactions.createdBy, users.id))
    .where(where)
    .orderBy(sql`${transactions.date} desc, ${transactions.id} desc`)
    .$dynamic();
  if (opts.limit) q.limit(opts.limit);
  if (opts.offset) q.offset(opts.offset);
  return q;
}

export async function summarizeTransactions(f: TxFilter) {
  const [r] = await db
    .select({
      n: sql<number>`count(*)::int`,
      inSum: sql<number>`coalesce(sum(case when ${transactions.direction}='in' then ${transactions.amount} else 0 end),0)::bigint`,
      outSum: sql<number>`coalesce(sum(case when ${transactions.direction}='out' then ${transactions.amount} else 0 end),0)::bigint`,
    })
    .from(transactions)
    .where(txWhere(f));
  return { n: r.n, inSum: Number(r.inSum), outSum: Number(r.outSum) };
}
