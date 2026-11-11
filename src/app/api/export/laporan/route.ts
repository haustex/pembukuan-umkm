import { getUser } from "@/lib/auth";
import { parseYear } from "@/lib/years";
import { buildYearWorkbook } from "@/lib/export-excel";
import { buildYearPdf } from "@/lib/export-pdf";
import { brandSlug } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const year = parseYear(url.searchParams.get("tahun") ?? undefined);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const name = `Laporan-Keuangan-${brandSlug()}-${year}`;

  if (format === "pdf") {
    const buf = await buildYearPdf(year);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const buf = await buildYearWorkbook(year);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
