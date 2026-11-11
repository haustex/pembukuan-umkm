import Link from "next/link";
import { requireUser, can } from "@/lib/auth";
import { getAccountBalances, getYearReport, listTransactions } from "@/lib/report";
import { availableYears, parseYear } from "@/lib/years";
import { currentYear, fmtDate, fmtDateLong, rp, todayJakarta } from "@/lib/format";
import { MONTHS_SHORT, SCHEME_LABEL } from "@/lib/constants";
import { Badge, Empty, Money, Notice, PageHeader, Stat } from "@/components/ui";
import YearSelect from "@/components/YearSelect";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const year = parseYear(sp.tahun);
  const today = todayJakarta();
  const isCurrent = year === currentYear();

  const [report, balances, recent, years] = await Promise.all([
    getYearReport(year),
    getAccountBalances(year, isCurrent ? today : undefined),
    listTransactions({ from: `${year}-01-01`, to: `${year}-12-31` }, { limit: 8 }),
    availableYears(),
  ]);
  const { months, pl, settings } = report;
  const totalKas = balances.reduce((s, b) => s + b.saldoAkhir, 0);
  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.omzet, m.hpp + m.beban)));

  // PPh final bulan lalu yang jatuh tempo
  const curMonth = Number(today.slice(5, 7));
  const prev = isCurrent && curMonth > 1 ? months[curMonth - 2] : null;
  const showDue = settings.taxScheme !== "pt_umum" && prev && prev.pphFinal > 0;

  return (
    <>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        description={`Ringkasan keuangan ${settings.businessName} · ${SCHEME_LABEL[settings.taxScheme]}`}
        actions={
          <>
            <YearSelect year={year} years={years} />
            {can.write(user.role) && (
              <Link href="/transaksi?baru=1" className="btn-primary">
                + Catat transaksi
              </Link>
            )}
          </>
        }
      />

      {showDue && (
        <div className="mb-6">
          <Notice tone="warn">
            PPh Final {prev!.label} sebesar <b className="num">Rp {rp(prev!.pphFinal)}</b> disetor paling lambat{" "}
            <b>{fmtDateLong(prev!.dueDate)}</b>. Setelah setor, catat sebagai kategori 8-01.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Omzet ${year}`} value={pl.omzet} hint={`HPP Rp ${rp(pl.hpp)}`} />
        <Stat label="Laba bersih" value={pl.labaBersih} tone={pl.labaBersih < 0 ? "neg" : undefined} hint="Sebelum pajak" />
        <Stat
          label="Estimasi PPh terutang"
          value={pl.pphTerutang}
          hint={pl.kurangBayar > 0 ? `Kurang bayar Rp ${rp(pl.kurangBayar)}` : "Sudah tersetor semua"}
        />
        <Stat label={isCurrent ? "Saldo kas & bank" : `Saldo akhir ${year}`} value={totalKas} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Omzet vs pengeluaran</h2>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-ink" /> Omzet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-neutral-300" /> HPP + beban
              </span>
            </div>
          </div>
          <div className="flex h-52 items-end gap-1.5 sm:gap-3">
            {months.map((m, i) => (
              <div key={m.month} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className="flex h-full items-end justify-center gap-0.5">
                  <div className="w-1/2 max-w-4 rounded-t-sm bg-ink" style={{ height: `${(Math.max(0, m.omzet) / maxBar) * 100}%` }} />
                  <div
                    className="w-1/2 max-w-4 rounded-t-sm bg-neutral-300"
                    style={{ height: `${(Math.max(0, m.hpp + m.beban) / maxBar) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-center text-[11px] text-muted">{MONTHS_SHORT[i]}</div>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-xs text-white group-hover:block">
                  <div className="font-medium">{m.label}</div>
                  <div className="num">Omzet {rp(m.omzet)}</div>
                  <div className="num">Keluar {rp(m.hpp + m.beban)}</div>
                  <div className="num">Laba {rp(m.laba)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Saldo per akun</h2>
          <ul className="space-y-3">
            {balances
              .filter((b) => b.active || b.saldoAkhir !== 0)
              .map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{b.name}</span>
                  <Money value={b.saldoAkhir} className={b.saldoAkhir < 0 ? "text-neg" : ""} />
                </li>
              ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm font-semibold">
            <span>Total</span>
            <Money value={totalKas} />
          </div>
        </section>
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold">Transaksi terakhir</h2>
          <Link href={`/transaksi?tahun=${year}`} className="text-sm text-muted hover:text-ink">
            Lihat semua →
          </Link>
        </div>
        {recent.length === 0 ? (
          <Empty title="Belum ada transaksi">Mulai dengan klik “Catat transaksi”.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="hidden w-28 whitespace-nowrap text-muted sm:table-cell">{fmtDate(t.date)}</td>
                    <td>
                      <div>{t.description}</div>
                      <div className="text-xs text-muted">
                        <span className="sm:hidden">{fmtDate(t.date)} · </span>
                        {t.categoryCode} {t.categoryName} · {t.accountName}
                      </div>
                    </td>
                    <td className="text-right">
                      <Money value={t.amount} signed={t.direction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {settings.taxScheme === "pt_umum" && pl.omzet > 0 && (
        <p className="mt-4 text-xs text-muted">
          <Badge>Ps 31E</Badge> Estimasi PPh Badan dihitung dari PKP Rp {rp(pl.pkp)} (laba + koreksi fiskal). Angka final tetap cek ke konsultan
          pajak.
        </p>
      )}
    </>
  );
}
