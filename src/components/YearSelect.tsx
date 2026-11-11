"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function YearSelect({ year, years }: { year: number; years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Tahun"
      className="field w-auto py-1.5 pr-8"
      value={year}
      onChange={(e) => {
        const p = new URLSearchParams(params.toString());
        p.set("tahun", e.target.value);
        p.delete("page");
        router.push(`${pathname}?${p.toString()}`);
      }}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
