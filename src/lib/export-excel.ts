import "server-only";
import ExcelJS from "exceljs";
import { getAccountBalances, getCategoryReport, getYearReport, listTransactions, type TxFilter } from "./report";
import { plLines } from "./pl-lines";
import { GROUP_LABEL, SCHEME_LABEL } from "./constants";
import { todayJakarta } from "./format";

const NUM = '#,##0;(#,##0);"-"';
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F3F3" } };

function newBook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "pembukuan-umkm";
  wb.created = new Date();
  return wb;
}

function title(ws: ExcelJS.Worksheet, text: string, sub: string) {
  ws.addRow([text]).font = { bold: true, size: 14 };
  ws.addRow([sub]).font = { color: { argb: "FF6B6B6B" } };
  ws.addRow([]);
}

function header(ws: ExcelJS.Worksheet, cols: string[]) {
  const r = ws.addRow(cols);
  r.font = { bold: true };
  r.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.border = { bottom: { style: "thin", color: { argb: "FFDDDDDD" } } };
  });
  return r;
}

function addTxSheet(wb: ExcelJS.Workbook, name: string, sub: string, rows: Awaited<ReturnType<typeof listTransactions>>) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4 }] });
  title(ws, name, sub);
  header(ws, ["Tanggal", "Keterangan", "Kode", "Kategori", "Akun", "Masuk (Rp)", "Keluar (Rp)", "No. Bukti", "Catatan", "Dicatat oleh"]);
  const sorted = [...rows].reverse(); // urut tanggal naik
  for (const t of sorted) {
    const [y, m, d] = t.date.split("-").map(Number);
    ws.addRow([
      new Date(Date.UTC(y, m - 1, d)),
      t.description,
      t.categoryCode,
      t.categoryName,
      t.accountName,
      t.direction === "in" ? t.amount : null,
      t.direction === "out" ? t.amount : null,
      t.ref,
      t.note,
      t.createdByName ?? "",
    ]);
  }
  const first = 5;
  const last = ws.rowCount;
  const total = ws.addRow(["Total", "", "", "", "", { formula: `SUM(F${first}:F${Math.max(first, last)})` }, { formula: `SUM(G${first}:G${Math.max(first, last)})` }]);
  total.font = { bold: true };
  total.getCell(6).border = total.getCell(7).border = { top: { style: "thin" } };
  ws.getColumn(1).numFmt = "dd/mm/yyyy";
  ws.getColumn(6).numFmt = NUM;
  ws.getColumn(7).numFmt = NUM;
  [12, 40, 7, 32, 14, 15, 15, 14, 30, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  if (sorted.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 10 } };
}

export async function buildYearWorkbook(year: number) {
  const [report, cats, balances, txs] = await Promise.all([
    getYearReport(year),
    getCategoryReport(year),
    getAccountBalances(year),
    listTransactions({ from: `${year}-01-01`, to: `${year}-12-31` }),
  ]);
  const { settings, months, totals, pl } = report;
  const isFinal = settings.taxScheme !== "pt_umum";
  const sub = `${settings.businessName} · Tahun buku ${year} · ${SCHEME_LABEL[settings.taxScheme]} · dicetak ${todayJakarta()}`;
  const wb = newBook();

  // 1. Laba rugi & pajak
  {
    const ws = wb.addWorksheet("Laba Rugi & Pajak");
    title(ws, "Laporan Laba Rugi & Estimasi Pajak", sub);
    for (const l of plLines(pl, isFinal)) {
      if (l.kind === "spacer") ws.addRow([]);
      else if (l.kind === "section") {
        const r = ws.addRow([l.label.toUpperCase()]);
        r.font = { bold: true, color: { argb: "FF6B6B6B" } };
        r.getCell(1).fill = r.getCell(2).fill = r.getCell(3).fill = HEADER_FILL;
      } else {
        const r = ws.addRow([l.label, l.value, l.note ?? ""]);
        if (l.strong) r.font = { bold: true };
        r.getCell(3).font = { color: { argb: "FF6B6B6B" }, italic: true };
        if (l.rule) r.getCell(2).border = { top: { style: l.rule === "double" ? "double" : "thin" } };
      }
    }
    ws.getColumn(1).width = 46;
    ws.getColumn(2).width = 18;
    ws.getColumn(2).numFmt = NUM;
    ws.getColumn(3).width = 42;
  }

  // 2. Rekap bulanan
  {
    const ws = wb.addWorksheet("Rekap Bulanan", { views: [{ state: "frozen", ySplit: 4 }] });
    title(ws, "Rekap Bulanan", sub);
    header(ws, ["Bulan", "Omzet", "Omzet Kumulatif", "PPh Final", "HPP", "Beban Usaha", "Lain-lain", "Laba Bersih", "Batas Setor PPh"]);
    for (const m of months) {
      const [y, mo, d] = m.dueDate.split("-").map(Number);
      ws.addRow([m.label, m.omzet, m.cumulative, m.pphFinal, m.hpp, m.beban, m.lain, m.laba, isFinal && m.pphFinal > 0 ? new Date(Date.UTC(y, mo - 1, d)) : "-"]);
    }
    const t = ws.addRow(["Total", totals.omzet, null, totals.pphFinal, totals.hpp, totals.beban, totals.lain, totals.laba]);
    t.font = { bold: true };
    t.eachCell((c) => (c.border = { top: { style: "thin" } }));
    for (let c = 2; c <= 8; c++) ws.getColumn(c).numFmt = NUM;
    ws.getColumn(9).numFmt = "dd/mm/yyyy";
    [14, 16, 16, 14, 16, 16, 14, 16, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  }

  // 3. Per kategori
  {
    const ws = wb.addWorksheet("Per Kategori", { views: [{ state: "frozen", ySplit: 4 }] });
    title(ws, "Rincian per Kategori", sub);
    header(ws, ["Kode", "Kategori", "Kelompok", "Jumlah Transaksi", "Masuk", "Keluar", "Bersih"]);
    for (const c of cats) ws.addRow([c.code, c.name, GROUP_LABEL[c.group], c.n, c.inSum, c.outSum, c.net]);
    for (const c of [5, 6, 7]) ws.getColumn(c).numFmt = NUM;
    [8, 36, 24, 10, 16, 16, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  }

  // 4. Saldo akun
  {
    const ws = wb.addWorksheet("Saldo Akun");
    title(ws, "Saldo per Akun", sub);
    header(ws, ["Akun", `Saldo Awal ${year}`, "Masuk", "Keluar", "Saldo Akhir"]);
    for (const b of balances) ws.addRow([b.name, b.saldoAwal, b.inSum, b.outSum, b.saldoAkhir]);
    const sum = (k: "saldoAwal" | "inSum" | "outSum" | "saldoAkhir") => balances.reduce((s, b) => s + b[k], 0);
    const t = ws.addRow(["Total", sum("saldoAwal"), sum("inSum"), sum("outSum"), sum("saldoAkhir")]);
    t.font = { bold: true };
    t.eachCell((c) => (c.border = { top: { style: "thin" } }));
    for (let c = 2; c <= 5; c++) ws.getColumn(c).numFmt = NUM;
    [22, 18, 18, 18, 18].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  }

  // 5. Buku kas
  addTxSheet(wb, "Buku Kas", sub, txs);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildTxWorkbook(filter: TxFilter, sub: string) {
  const rows = await listTransactions(filter);
  const wb = newBook();
  addTxSheet(wb, "Transaksi", sub, rows);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
