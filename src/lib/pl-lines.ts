import type { getYearReport } from "./report";

type PL = Awaited<ReturnType<typeof getYearReport>>["pl"];

export type PLLine =
  | { kind: "section"; label: string }
  | { kind: "line"; label: string; value: number; note?: string; strong?: boolean; rule?: "single" | "double" }
  | { kind: "spacer" };

/** Susunan laporan laba rugi & pajak — dipakai di halaman, Excel, dan PDF. */
export function plLines(pl: PL, schemeIsFinal: boolean): PLLine[] {
  return [
    { kind: "section", label: "Laba Rugi Komersial" },
    { kind: "line", label: "Pendapatan usaha (omzet)", value: pl.omzet, note: "Kategori 4-xx" },
    { kind: "line", label: "Harga pokok penjualan (HPP)", value: -pl.hpp, note: "Kategori 5-xx" },
    { kind: "line", label: "Laba kotor", value: pl.labaKotor, strong: true, rule: "single" },
    { kind: "line", label: "Beban usaha", value: -pl.beban, note: "Kategori 6-xx" },
    { kind: "line", label: "Penyusutan aset tetap", value: -pl.depreciation, note: "Diisi di Pengaturan" },
    { kind: "line", label: "Laba usaha", value: pl.labaUsaha, strong: true, rule: "single" },
    { kind: "line", label: "Pendapatan (beban) lain-lain", value: pl.lain, note: "Kategori 7-xx" },
    { kind: "line", label: "Laba bersih sebelum pajak", value: pl.labaBersih, strong: true, rule: "double" },
    { kind: "spacer" },
    { kind: "section", label: "Koreksi Fiskal" },
    { kind: "line", label: "Laba bersih komersial", value: pl.labaBersih },
    { kind: "line", label: "(+) Biaya yang tidak boleh dikurangkan", value: pl.koreksiPlus, note: "Jamuan, sumbangan, denda (6-9x)" },
    { kind: "line", label: "(−) Penghasilan yang sudah kena PPh Final", value: -pl.koreksiMinus, note: "Bunga / jasa giro bank" },
    { kind: "line", label: "Penghasilan Kena Pajak (PKP)", value: pl.pkp, strong: true, rule: "single", note: "Dibulatkan ke bawah ribuan" },
    { kind: "spacer" },
    { kind: "section", label: "Estimasi PPh" },
    {
      kind: "line",
      label: "PPh Badan tarif umum + fasilitas Ps 31E",
      value: pl.pphBadan,
      note: schemeIsFinal ? "Pembanding saja" : "Omzet ≤ Rp4,8 M: efektif 11% dari PKP",
    },
    { kind: "line", label: "PPh Final UMKM setahun", value: pl.pphFinal, note: schemeIsFinal ? "Total dari rekap bulanan" : "Tidak berlaku untuk skema ini" },
    { kind: "line", label: "PPh terutang sesuai skema", value: pl.pphTerutang, strong: true },
    { kind: "line", label: "PPh yang sudah disetor", value: -pl.pphDisetor, note: "Kategori 8-xx" },
    { kind: "line", label: "Kurang / (lebih) bayar", value: pl.kurangBayar, strong: true, rule: "single" },
    { kind: "spacer" },
    { kind: "section", label: "Modal, Aset & Pinjaman (bukan laba rugi)" },
    { kind: "line", label: "Pembelian aset tetap", value: pl.asetDibeli, note: "Kategori 1-xx" },
    { kind: "line", label: "Pinjaman bersih (diterima − cicilan pokok)", value: pl.pinjamanNet, note: "Kategori 2-xx" },
    { kind: "line", label: "Modal bersih (setoran − pengambilan)", value: pl.modalNet, note: "Kategori 3-xx" },
  ];
}
