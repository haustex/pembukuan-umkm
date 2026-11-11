import { requireUser } from "@/lib/auth";
import { getAccountBalances, getCategoryReport, getYearReport } from "@/lib/report";
import { availableYears, parseYear } from "@/lib/years";
import { plLines } from "@/lib/pl-lines";
import { fmtDate, rp } from "@/lib/format";
import { GROUP_LABEL, GROUP_ORDER, SCHEME_LABEL } from "@/lib/constants";
import { Badge, Money, PageHeader, Tabs } from "@/components/ui";
import YearSelect from "@/components/YearSelect";

export const metadata = { title: "Laporan" };

const TABS = [
  { key: "labarugi", label: "Laba Rugi & Pajak" },
  { key: "bulanan", label: "Rekap Bulanan" },
  { key: "kategori", label: "Per Kategori" },
  { key: "saldo", label: "Saldo Akun" },
];

export default async function LaporanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const year = parseYear(sp.tahun);
  const tab = TABS.some((t) => t.key === sp.tab) ? String(sp.tab) : "labarugi";
  const [report, years] = await Promise.all([getYearReport(year), availableYears()]);
  const { settings, months, totals, pl } = report;
  const isFinal = settings.taxScheme !== "pt_umum";

  return (
    <>
      <PageHeader
        title="Laporan"
        description={
          <>
            Tahun buku {year} · {SCHEME_LABEL[settings.taxScheme]}
          </>
        }
        actions={
          <>
            <YearSelect year={year} years={years} />
            <a href={`/api/export/laporan?tahun=${year}&format=xlsx`} className="btn-ghost">
              <FileIcon /> Excel
            </a>
            <a href={`/api/export/laporan?tahun=${year}&format=pdf`} className="btn-ghost">
              <FileIcon /> PDF
            </a>
            <a href={`/api/export/transaksi?tahun=${year}&format=pdf`} className="btn-ghost">
              <FileIcon /> Buku Kas PDF
            </a>
          </>
        }
      />

      <Tabs active={tab} items={TABS.map((t) => ({ ...t, href: `/laporan?tahun=${year}&tab=${t.key}` }))} />

      {tab === "labarugi" && (
        <div className="card overflow-hidden">
          <table className="table-base">
            <tbody>
              {plLines(pl, isFinal).map((l, i) => {
                if (l.kind === "spacer") return <tr key={i}><td colSpan={3} className="h-3 border-0 bg-white p-0" /></tr>;
                if (l.kind === "section")
                  return (
                    <tr key={i}>
                      <td colSpan={3} className="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                        {l.label}
                      </td>
                    </tr>
                  );
                return (
                  <tr key={i} className={l.rule === "double" ? "border-b-2 border-double border-ink" : ""}>
                    <td className={l.strong ? "font-semibold" : ""}>{l.label}</td>
                    <td className="hidden text-xs text-muted sm:table-cell">{l.note}</td>
                    <td className={`num w-44 text-right ${l.strong ? "font-semibold" : ""} ${l.value < 0 ? "text-neg" : ""}`}>
                      {rp(l.value, { accounting: true, dashZero: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "bulanan" && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="text-right">Omzet</th>
                <th className="text-right">Kumulatif</th>
                <th className="text-right">PPh Final</th>
                <th className="text-right">HPP</th>
                <th className="text-right">Beban</th>
                <th className="text-right">Lain-lain</th>
                <th className="text-right">Laba</th>
                <th>Batas setor</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <td className="font-medium">{m.label}</td>
                  <Td v={m.omzet} />
                  <Td v={m.cumulative} muted />
                  <Td v={m.pphFinal} />
                  <Td v={m.hpp} />
                  <Td v={m.beban} />
                  <Td v={m.lain} />
                  <Td v={m.laba} strong />
                  <td className="whitespace-nowrap text-muted">{isFinal && m.pphFinal > 0 ? fmtDate(m.dueDate) : "–"}</td>
                </tr>
              ))}
              <tr className="bg-surface font-semibold">
                <td>Total</td>
                <Td v={totals.omzet} />
                <td />
                <Td v={totals.pphFinal} />
                <Td v={totals.hpp} />
                <Td v={totals.beban} />
                <Td v={totals.lain} />
                <Td v={totals.laba} />
                <td />
              </tr>
            </tbody>
          </table>
          {!isFinal && (
            <p className="border-t border-line px-4 py-3 text-xs text-muted">
              Skema tarif umum: tidak ada PPh Final bulanan. Angsuran PPh 25 tahun pertama umumnya nihil; PPh Badan dihitung di SPT Tahunan.
            </p>
          )}
        </div>
      )}

      {tab === "kategori" && <CategoryTab year={year} />}
      {tab === "saldo" && <BalanceTab year={year} />}
    </>
  );
}

function Td({ v, strong, muted }: { v: number; strong?: boolean; muted?: boolean }) {
  return (
    <td className={`num text-right whitespace-nowrap ${strong ? "font-semibold" : ""} ${muted ? "text-muted" : ""} ${v < 0 ? "text-neg" : ""}`}>
      {rp(v, { accounting: true, dashZero: true })}
    </td>
  );
}

async function CategoryTab({ year }: { year: number }) {
  const rows = await getCategoryReport(year);
  return (
    <div className="space-y-4">
      {GROUP_ORDER.map((g) => {
        const items = rows.filter((r) => r.group === g);
        if (!items.length) return null;
        const total = items.reduce((s, r) => s + r.net, 0);
        return (
          <div key={g} className="card overflow-x-auto">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-sm font-semibold">{GROUP_LABEL[g]}</h3>
              <Money value={total} className="text-sm font-semibold" />
            </div>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th className="text-right">Transaksi</th>
                  <th className="text-right">Masuk</th>
                  <th className="text-right">Keluar</th>
                  <th className="text-right">Bersih</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="text-muted">{r.code}</span> {r.name}
                    </td>
                    <td className="num text-right text-muted">{r.n || "–"}</td>
                    <td className="num text-right">{rp(r.inSum, { dashZero: true })}</td>
                    <td className="num text-right">{rp(r.outSum, { dashZero: true })}</td>
                    <td className="num text-right font-medium">{rp(r.net, { accounting: true, dashZero: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

async function BalanceTab({ year }: { year: number }) {
  const rows = await getAccountBalances(year);
  const sum = (k: "saldoAwal" | "inSum" | "outSum" | "saldoAkhir") => rows.reduce((s, r) => s + r[k], 0);
  return (
    <div className="card overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Akun</th>
            <th className="text-right">Saldo awal {year}</th>
            <th className="text-right">Masuk</th>
            <th className="text-right">Keluar</th>
            <th className="text-right">Saldo akhir</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {r.name} {!r.active && <Badge>Nonaktif</Badge>}
              </td>
              <Td v={r.saldoAwal} />
              <Td v={r.inSum} />
              <Td v={r.outSum} />
              <Td v={r.saldoAkhir} strong />
            </tr>
          ))}
          <tr className="bg-surface font-semibold">
            <td>Total</td>
            <Td v={sum("saldoAwal")} />
            <Td v={sum("inSum")} />
            <Td v={sum("outSum")} />
            <Td v={sum("saldoAkhir")} />
          </tr>
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-3 text-xs text-muted">
        Cocokkan saldo akhir dengan mutasi rekening tiap bulan. Kalau beda, ada transaksi yang belum dicatat.
      </p>
    </div>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
    </svg>
  );
}
