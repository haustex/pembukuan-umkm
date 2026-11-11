import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, categories } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { filterFromParams, type SP } from "@/lib/txfilter";
import { getSettings } from "@/lib/report";
import { buildTxWorkbook } from "@/lib/export-excel";
import { buildTxPdf } from "@/lib/export-pdf";
import { MONTHS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { brandSlug } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const sp: SP = Object.fromEntries(url.searchParams.entries());
  const { filter, year, month } = filterFromParams(sp);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const s = await getSettings();

  // keterangan filter untuk subjudul
  const parts = [s.businessName, `Periode ${fmtDate(filter.from!)} – ${fmtDate(filter.to!)}`];
  if (filter.accountId) {
    const [a] = await db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, filter.accountId));
    if (a) parts.push(`Akun: ${a.name}`);
  }
  if (filter.categoryId) {
    const [c] = await db.select({ code: categories.code, name: categories.name }).from(categories).where(eq(categories.id, filter.categoryId)).orderBy(asc(categories.code));
    if (c) parts.push(`Kategori: ${c.code} ${c.name}`);
  }
  if (filter.direction) parts.push(filter.direction === "in" ? "Uang masuk" : "Uang keluar");
  if (filter.q) parts.push(`Cari: "${filter.q}"`);
  const sub = parts.join(" · ");
  const name = `Buku-Kas-${brandSlug()}-${year}${month ? `-${String(month).padStart(2, "0")}` : ""}`;
  const title = `Buku Kas ${month ? `${MONTHS[month - 1]} ` : ""}${year}`;

  if (format === "pdf") {
    const buf = await buildTxPdf(filter, title, sub);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"`, "Cache-Control": "no-store" },
    });
  }
  const buf = await buildTxWorkbook(filter, sub);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
