"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./ui";

type Item = { href: string; label: string; icon: React.ReactNode };

const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
  user: <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />,
};

const icon = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

export default function Nav({
  brand,
  isOwner,
  user,
  logoutAction,
}: {
  brand: string;
  isOwner: boolean;
  user: { name: string; roleLabel: string };
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items: Item[] = [
    { href: "/", label: "Dashboard", icon: icon(I.home) },
    { href: "/transaksi", label: "Transaksi", icon: icon(I.list) },
    { href: "/laporan", label: "Laporan", icon: icon(I.chart) },
    ...(isOwner
      ? [
          { href: "/pengaturan", label: "Pengaturan", icon: icon(I.gear) },
          { href: "/pengguna", label: "Pengguna", icon: icon(I.users) },
        ]
      : []),
    { href: "/akun", label: "Akun Saya", icon: icon(I.user) },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const links = (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
            isActive(it.href) ? "bg-surface font-medium text-ink" : "text-muted hover:bg-surface hover:text-ink"
          }`}
        >
          {it.icon}
          {it.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-line pt-4">
      <div className="px-3 text-sm font-medium">{user.name}</div>
      <div className="px-3 text-xs text-muted">{user.roleLabel}</div>
      <form action={logoutAction}>
        <button className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface hover:text-ink">Keluar</button>
      </form>
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between border-r border-line bg-white p-4 lg:flex">
        <div>
          <Link href="/" className="mb-8 block px-3 pt-2">
            <Wordmark name={brand} />
            <div className="mt-0.5 text-xs text-muted">Laporan Keuangan</div>
          </Link>
          {links}
        </div>
        {footer}
      </aside>

      {/* mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <Link href="/">
          <Wordmark name={brand} className="text-[15px]" />
        </Link>
        <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 hover:bg-surface">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-14 z-20 border-b border-line bg-white p-4 shadow-sm lg:hidden">
          {links}
          <div className="mt-4">{footer}</div>
        </div>
      )}
    </>
  );
}
