import "server-only";
import PDFDocument from "pdfkit";
import { getAccountBalances, getCategoryReport, getYearReport, listTransactions, type TxFilter } from "./report";
import { plLines } from "./pl-lines";
import { GROUP_LABEL, GROUP_ORDER, SCHEME_LABEL } from "./constants";
import { fmtDate, fmtDateLong, rp, todayJakarta } from "./format";
import { brandName } from "./brand";

const INK = "#0c0c0c";
const MUTED = "#6b6b6b";
const LINE = "#e5e5e5";
const SURFACE = "#f5f5f5";
const RED = "#b91c1c";

type Doc = PDFKit.PDFDocument;
type Col = { label: string; width: number; align?: "left" | "right" };
type Cell = string | { text: string; bold?: boolean; color?: string };

function makeDoc(layout: "portrait" | "landscape") {
  return new PDFDocument({ size: "A4", layout, margins: { top: 48, bottom: 56, left: 40, right: 40 }, bufferPages: true, info: { Title: `Laporan Keuangan ${brandName()}`, Author: brandName(), Creator: "pembukuan-umkm" } });
}

function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function contentWidth(doc: Doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function brandHeader(doc: Doc, title: string, sub: string) {
  const x = doc.page.margins.left;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(MUTED).text("//", x, doc.page.margins.top, { continued: true });
  doc.fillColor(INK).text(` ${brandName().toUpperCase()}`, { characterSpacing: 1.2 });
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(title, x);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(sub, x, undefined, { width: contentWidth(doc) });
  doc.moveDown(1);
}

function sectionTitle(doc: Doc, text: string) {
  ensureSpace(doc, 60);
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(text, doc.page.margins.left);
  doc.moveDown(0.4);
}

function ensureSpace(doc: Doc, h: number) {
  if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function table(doc: Doc, cols: Col[], rows: Cell[][], opts: { totalRow?: Cell[]; rowHeight?: number; fontSize?: number } = {}) {
  const x0 = doc.page.margins.left;
  const rh = opts.rowHeight ?? 18;
  const fs = opts.fontSize ?? 8.5;
  const totalW = cols.reduce((s, c) => s + c.width, 0);

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(x0, y, totalW, rh).fill(SURFACE);
    let x = x0;
    doc.font("Helvetica-Bold").fontSize(fs - 0.5).fillColor(MUTED);
    for (const c of cols) {
      doc.text(c.label, x + 5, y + (rh - fs) / 2 + 0.5, { width: c.width - 10, align: c.align ?? "left", lineBreak: false, ellipsis: true });
      x += c.width;
    }
    doc.y = y + rh;
  };

  const drawRow = (cells: Cell[], bold = false, topRule = false) => {
    if (doc.y + rh > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    if (topRule) doc.moveTo(x0, y).lineTo(x0 + totalW, y).lineWidth(0.8).strokeColor(INK).stroke();
    let x = x0;
    cells.forEach((cell, i) => {
      const c = cols[i];
      const obj = typeof cell === "string" ? { text: cell } : cell;
      doc
        .font(obj.bold || bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fs)
        .fillColor(obj.color ?? INK)
        .text(obj.text, x + 5, y + (rh - fs) / 2 + 0.5, { width: c.width - 10, align: c.align ?? "left", lineBreak: false, ellipsis: true });
      x += c.width;
    });
    doc.moveTo(x0, y + rh).lineTo(x0 + totalW, y + rh).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.y = y + rh;
  };

  drawHeader();
  for (const r of rows) drawRow(r);
  if (opts.totalRow) drawRow(opts.totalRow, true, true);
  doc.x = x0;
}

function n(v: number, dash = true): Cell {
  return { text: rp(v, { accounting: true, dashZero: dash }), color: v < 0 ? RED : INK };
}

function footer(doc: Doc, left: string) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 34;
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // supaya teks footer tidak memicu halaman baru
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(left, doc.page.margins.left, y, { lineBreak: false });
    doc.text(`Halaman ${i + 1} dari ${range.count}`, doc.page.margins.left, y, { width: contentWidth(doc), align: "right", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
}

export async function buildYearPdf(year: number) {
  const [report, cats, balances] = await Promise.all([getYearReport(year), getCategoryReport(year), getAccountBalances(year)]);
  const { settings, months, totals, pl } = report;
  const isFinal = settings.taxScheme !== "pt_umum";
  const doc = makeDoc("portrait");
  const out = toBuffer(doc);
  const sub = `${settings.businessName} · Tahun buku ${year} (1 Januari – 31 Desember ${year}) · ${SCHEME_LABEL[settings.taxScheme]}`;
  const W = contentWidth(doc); // ~515

  // Halaman 1: laba rugi & pajak
  brandHeader(doc, "Laporan Laba Rugi & Estimasi Pajak", sub);
  const plCols: Col[] = [
    { label: "Uraian", width: 250 },
    { label: "Keterangan", width: W - 250 - 110 },
    { label: "Rp", width: 110, align: "right" },
  ];
  const plRows: Cell[][] = [];
  for (const l of plLines(pl, isFinal)) {
    if (l.kind === "spacer") continue;
    if (l.kind === "section") plRows.push([{ text: l.label.toUpperCase(), bold: true, color: MUTED }, "", ""]);
    else
      plRows.push([
        { text: l.label, bold: l.strong },
        { text: l.note ?? "", color: MUTED },
        { ...(n(l.value) as { text: string; color: string }), bold: l.strong },
      ]);
  }
  table(doc, plCols, plRows, { rowHeight: 19, fontSize: 9 });
  doc.moveDown(1);
  doc
    .font("Helvetica-Oblique")
    .fontSize(7.5)
    .fillColor(MUTED)
    .text(
      "Estimasi untuk persiapan SPT. Angka final tetap dikonfirmasi ke KPP / konsultan pajak. Dasar: PP 20/2026 dan Pasal 31E UU PPh.",
      doc.page.margins.left,
      undefined,
      { width: W },
    );

  // Halaman 2: rekap bulanan + saldo akun
  doc.addPage();
  brandHeader(doc, "Rekap Bulanan", sub);
  const mw = [60, 60, 62, 52, 56, 56, 50, 60, 62];
  const scale = W / mw.reduce((a, b) => a + b, 0);
  const mCols: Col[] = ["Bulan", "Omzet", "Kumulatif", "PPh Final", "HPP", "Beban", "Lain-lain", "Laba", "Batas setor"].map((label, i) => ({
    label,
    width: mw[i] * scale,
    align: i === 0 ? "left" : "right",
  }));
  table(
    doc,
    mCols,
    months.map((m) => [m.label, n(m.omzet), { text: rp(m.cumulative, { dashZero: true }), color: MUTED }, n(m.pphFinal), n(m.hpp), n(m.beban), n(m.lain), n(m.laba), isFinal && m.pphFinal > 0 ? fmtDate(m.dueDate) : "–"]),
    { totalRow: ["Total", n(totals.omzet), "", n(totals.pphFinal), n(totals.hpp), n(totals.beban), n(totals.lain), n(totals.laba), ""], fontSize: 8 },
  );

  sectionTitle(doc, "Saldo per Akun");
  const bCols: Col[] = [
    { label: "Akun", width: W - 4 * 100 },
    { label: `Saldo awal ${year}`, width: 100, align: "right" },
    { label: "Masuk", width: 100, align: "right" },
    { label: "Keluar", width: 100, align: "right" },
    { label: "Saldo akhir", width: 100, align: "right" },
  ];
  const bsum = (k: "saldoAwal" | "inSum" | "outSum" | "saldoAkhir") => balances.reduce((s, b) => s + b[k], 0);
  table(
    doc,
    bCols,
    balances.map((b) => [b.name, n(b.saldoAwal), n(b.inSum), n(b.outSum), n(b.saldoAkhir)]),
    { totalRow: ["Total", n(bsum("saldoAwal")), n(bsum("inSum")), n(bsum("outSum")), n(bsum("saldoAkhir"))] },
  );

  // Halaman 3: per kategori
  doc.addPage();
  brandHeader(doc, "Rincian per Kategori", sub);
  const cCols: Col[] = [
    { label: "Kode", width: 40 },
    { label: "Kategori", width: W - 40 - 40 - 3 * 95 },
    { label: "Trx", width: 40, align: "right" },
    { label: "Masuk", width: 95, align: "right" },
    { label: "Keluar", width: 95, align: "right" },
    { label: "Bersih", width: 95, align: "right" },
  ];
  const cRows: Cell[][] = [];
  for (const g of GROUP_ORDER) {
    const items = cats.filter((c) => c.group === g);
    if (!items.length) continue;
    const tot = items.reduce((s, c) => s + c.net, 0);
    cRows.push([{ text: "", bold: true }, { text: GROUP_LABEL[g].toUpperCase(), bold: true, color: MUTED }, "", "", "", { ...(n(tot) as { text: string; color: string }), bold: true }]);
    for (const c of items) cRows.push([{ text: c.code, color: MUTED }, c.name, { text: c.n ? String(c.n) : "–", color: MUTED }, n(c.inSum), n(c.outSum), n(c.net)]);
  }
  table(doc, cCols, cRows, { fontSize: 8 });

  footer(doc, `${brandName()} · dicetak ${fmtDateLong(todayJakarta())}`);
  doc.end();
  return out;
}

export async function buildTxPdf(filter: TxFilter, title: string, sub: string) {
  const rows = [...(await listTransactions(filter))].reverse();
  const doc = makeDoc("landscape");
  const out = toBuffer(doc);
  brandHeader(doc, title, sub);
  const W = contentWidth(doc); // ~762
  const cols: Col[] = [
    { label: "Tanggal", width: 62 },
    { label: "Keterangan", width: W - 62 - 165 - 80 - 72 - 2 * 92 },
    { label: "Kategori", width: 165 },
    { label: "Akun", width: 80 },
    { label: "No. bukti", width: 72 },
    { label: "Masuk", width: 92, align: "right" },
    { label: "Keluar", width: 92, align: "right" },
  ];
  let inSum = 0;
  let outSum = 0;
  const body: Cell[][] = rows.map((t) => {
    if (t.direction === "in") inSum += t.amount;
    else outSum += t.amount;
    return [
      fmtDate(t.date),
      t.description,
      { text: `${t.categoryCode} ${t.categoryName}`, color: MUTED },
      t.accountName,
      { text: t.ref, color: MUTED },
      t.direction === "in" ? rp(t.amount) : "",
      t.direction === "out" ? rp(t.amount) : "",
    ];
  });
  if (!body.length) body.push(["", { text: "Tidak ada transaksi", color: MUTED }, "", "", "", "", ""]);
  table(doc, cols, body, { totalRow: [`${rows.length} trx`, "Total", "", "", "", rp(inSum), rp(outSum)], fontSize: 8 });
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(`Selisih (masuk − keluar): Rp ${rp(inSum - outSum, { accounting: true })}`, doc.page.margins.left, undefined, { width: W, align: "right" });
  footer(doc, `${brandName()} · dicetak ${fmtDateLong(todayJakarta())}`);
  doc.end();
  return out;
}
