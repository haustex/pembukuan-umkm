import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, categories } from "@/lib/db/schema";
import { can, requireUser } from "@/lib/auth";
import { listTransactions, summarizeTransactions, type TxFilter } from "@/lib/report";
import { availableYears } from "@/lib/years";
import { filterFromParams, one, type SP } from "@/lib/txfilter";
import { rp, todayJakarta } from "@/lib/format";
import { MONTHS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import TransactionsClient, { type TxRow } from "./TransactionsClient";

export const metadata = { title: "Transaksi" };

const PAGE_SIZE = 50;

export default async function TransaksiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { filter, year, month } = filterFromParams(sp);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [rows, summary, cats, accs, years] = await Promise.all([
    listTransactions(filter, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    summarizeTransactions(filter),
    db.select().from(categories).orderBy(asc(categories.code)),
    db.select().from(accounts).orderBy(asc(accounts.sort), asc(accounts.id)),
    availableYears(),
  ]);
  const pages = Math.max(1, Math.ceil(summary.n / PAGE_SIZE));

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      tahun: year,
      bulan: month || undefined,
      kategori: filter.categoryId,
      akun: filter.accountId,
      jenis: filter.direction,
      q: filter.q,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.toString();
  };

  return (
    <>
      <PageHeader
        title="Transaksi"
        description="Semua uang masuk dan keluar. Klik baris untuk mengubah."
        actions={
          <>
            <a href={`/api/export/transaksi?${qs({ page: undefined })}`} className="btn-ghost">
              Excel
            </a>
            <a href={`/api/export/transaksi?${qs({ page: undefined, format: "pdf" })}`} className="btn-ghost">
              PDF
            </a>
            {can.write(user.role) && (
              <Link href={`/transaksi?${qs({ baru: 1 })}`} scroll={false} className="btn-primary">
                + Catat transaksi
              </Link>
            )}
          </>
        }
      />

      <form method="get" className="card grid grid-cols-2 gap-3 p-4 md:grid-cols-6">
        <div>
          <label className="label">Tahun</label>
          <select name="tahun" defaultValue={year} className="field">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bulan</label>
          <select name="bulan" defaultValue={month} className="field">
            <option value={0}>Semua</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jenis</label>
          <select name="jenis" defaultValue={filter.direction ?? ""} className="field">
            <option value="">Semua</option>
            <option value="in">Masuk</option>
            <option value="out">Keluar</option>
          </select>
        </div>
        <div>
          <label className="label">Akun</label>
          <select name="akun" defaultValue={filter.accountId ?? ""} className="field">
            <option value="">Semua</option>
            {accs.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 md:col-span-2">
          <label className="label">Kategori</label>
          <select name="kategori" defaultValue={filter.categoryId ?? ""} className="field">
            <option value="">Semua</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.code} {c.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="label">Cari</label>
          <input name="q" defaultValue={filter.q ?? ""} placeholder="Keterangan, no. bukti, catatan…" className="field" />
        </div>
        <div className="col-span-2 flex items-end gap-2">
          <button className="btn-primary flex-1">Terapkan</button>
          <Link href={`/transaksi?tahun=${year}`} className="btn-ghost">Reset</Link>
        </div>
      </form>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="card px-4 py-3">
          <div className="text-xs text-muted">Masuk</div>
          <div className="num mt-0.5 font-semibold text-pos">{rp(summary.inSum)}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-muted">Keluar</div>
          <div className="num mt-0.5 font-semibold text-neg">{rp(summary.outSum)}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-muted">{summary.n} transaksi · selisih</div>
          <div className="num mt-0.5 font-semibold">{rp(summary.inSum - summary.outSum, { accounting: true })}</div>
        </div>
      </div>

      <TransactionsClient
        rows={rows as TxRow[]}
        categories={cats}
        accounts={accs}
        canWrite={can.write(user.role)}
        canDelete={can.delete(user.role)}
        today={todayJakarta()}
        openNew={one(sp.baru) === "1"}
      />

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Halaman {page} dari {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-ghost" href={`/transaksi?${qs({ page: page - 1 })}`}>← Sebelumnya</Link>}
            {page < pages && <Link className="btn-ghost" href={`/transaksi?${qs({ page: page + 1 })}`}>Berikutnya →</Link>}
          </div>
        </div>
      )}
    </>
  );
}

