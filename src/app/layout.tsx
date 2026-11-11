import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brandName } from "@/lib/brand";

export function generateMetadata(): Metadata {
  const b = brandName();
  return {
    title: { default: `Laporan Keuangan — ${b}`, template: `%s · ${b}` },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh font-sans text-[15px]">{children}</body>
    </html>
  );
}
