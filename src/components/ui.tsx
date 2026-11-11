import Link from "next/link";
import { rp } from "@/lib/format";

export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`font-brand text-[17px] font-semibold tracking-wide uppercase ${className}`}>
      <span className="text-muted">//</span> {name}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: React.ReactNode;
  tone?: "pos" | "neg";
}) {
  const color = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "";
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`num mt-2 text-xl font-semibold tracking-tight ${color}`}>
        <span className="mr-1 text-sm font-normal text-muted">Rp</span>
        {rp(value, { accounting: true })}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Money({ value, signed, className = "" }: { value: number; signed?: "in" | "out"; className?: string }) {
  const color = signed === "in" ? "text-pos" : signed === "out" ? "text-neg" : "";
  const prefix = signed === "in" ? "+" : signed === "out" ? "−" : "";
  return (
    <span className={`num whitespace-nowrap ${color} ${className}`}>
      {prefix}
      {rp(value, { accounting: !signed })}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "pos" | "neg" | "warn" }) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-700",
    pos: "bg-green-50 text-green-700",
    neg: "bg-red-50 text-red-700",
    warn: "bg-amber-50 text-amber-800",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Tabs({ items, active }: { items: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition ${
            t.key === active ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function Notice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "pos" | "neg" }) {
  const tones = {
    neutral: "border-line bg-surface text-neutral-700",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    pos: "border-green-200 bg-green-50 text-green-800",
    neg: "border-red-200 bg-red-50 text-red-800",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
