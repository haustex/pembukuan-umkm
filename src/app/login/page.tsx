import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Wordmark } from "@/components/ui";
import { brandName, REPO_URL } from "@/lib/brand";
import { getSettings } from "@/lib/report";
import LoginForm from "./LoginForm";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  const settings = await getSettings();
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark name={brandName()} className="text-xl" />
          <p className="mt-2 text-sm text-muted">Laporan Keuangan</p>
        </div>
        <div className="card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h1 className="text-base font-semibold">Masuk</h1>
          <p className="mt-1 mb-5 text-sm text-muted">Pakai email dan password akun lo.</p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted">{settings.businessName}</p>
        <p className="mt-1 text-center text-[11px] text-neutral-400">
          <a href={REPO_URL} target="_blank" rel="noopener" className="hover:text-ink">Open source</a> · dibuat oleh{" "}
          <a href="https://hauskayu.com" target="_blank" rel="noopener" className="hover:text-ink">Haus Kayu</a>, Jepara
        </p>
      </div>
    </main>
  );
}
