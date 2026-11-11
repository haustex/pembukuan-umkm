import { MONTHS, MONTHS_SHORT } from "./constants";

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 1500000 → "1.500.000"; negatif → "(1.500.000)" bila accounting=true */
export function rp(n: number, opts: { accounting?: boolean; dashZero?: boolean } = {}) {
  const v = Math.round(n || 0);
  if (opts.dashZero && v === 0) return "–";
  if (opts.accounting && v < 0) return `(${nf.format(Math.abs(v))})`;
  return nf.format(v);
}

export function rpLabel(n: number) {
  return `Rp ${rp(n)}`;
}

/** "2026-06-03" → "3 Jun 2026" */
export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function fmtDateLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Tanggal hari ini di Asia/Jakarta, format YYYY-MM-DD */
export function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentYear() {
  return Number(todayJakarta().slice(0, 4));
}

/** "1.500.000" / "1500000" / "1,500,000" → 1500000 */
export function parseRupiah(input: string): number {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function pct(bp: number) {
  return `${(bp / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}
