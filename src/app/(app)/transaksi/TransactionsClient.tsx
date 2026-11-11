"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction, saveTransaction, type TxState } from "./actions";
import { GROUP_LABEL, GROUP_ORDER, suggestDirection } from "@/lib/constants";
import type { CategoryGroup } from "@/lib/db/schema";

export type TxRow = {
  id: number;
  date: string;
  description: string;
  direction: "in" | "out";
  amount: number;
  ref: string;
  note: string;
  categoryId: number;
  accountId: number;
  categoryCode: string;
  categoryName: string;
  accountName: string;
  createdByName: string | null;
};
type Cat = { id: number; code: string; name: string; group: CategoryGroup; description: string; active: boolean };
type Acc = { id: number; name: string; active: boolean };
type Mode = "in" | "out" | "transfer";

const nf = new Intl.NumberFormat("id-ID");
const fmt = (n: number) => nf.format(n);
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][m - 1]} ${y}`;
};

export default function TransactionsClient({
  rows,
  categories,
  accounts,
  canWrite,
  canDelete,
  today,
  openNew,
}: {
  rows: TxRow[];
  categories: Cat[];
  accounts: Acc[];
  canWrite: boolean;
  canDelete: boolean;
  today: string;
  openNew: boolean;
}) {
  const [editing, setEditing] = useState<TxRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const open = (row: TxRow | null) => {
    setEditing(row);
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    if (openNew && canWrite) {
      open(null);
      const p = new URLSearchParams(window.location.search);
      p.delete("baru");
      router.replace(`/transaksi${p.size ? `?${p}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);

  return (
    <>
      {canWrite && (
        <div className="fixed right-5 bottom-5 z-20 sm:hidden">
          <button onClick={() => open(null)} className="btn-primary rounded-full px-5 py-3 shadow-lg">
            + Catat
          </button>
        </div>
      )}

      <div className="card mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="text-sm font-medium">Tidak ada transaksi</div>
            <div className="mt-1 text-sm text-muted">Coba ubah filter, atau catat transaksi baru.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th className="hidden md:table-cell">Kategori</th>
                  <th className="hidden sm:table-cell">Akun</th>
                  <th className="text-right">Nominal (Rp)</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className={canWrite ? "cursor-pointer" : ""} onClick={() => canWrite && open(t)}>
                    <td className="whitespace-nowrap text-muted">{fmtDate(t.date)}</td>
                    <td className="min-w-48">
                      <div>{t.description}</div>
                      <div className="text-xs text-muted">
                        <span className="md:hidden">
                          {t.categoryCode} {t.categoryName} ·{" "}
                        </span>
                        {t.ref && <span>#{t.ref} </span>}
                        {t.note && <span>· {t.note}</span>}
                      </div>
                    </td>
                    <td className="hidden text-muted md:table-cell">
                      <span className="text-ink">{t.categoryCode}</span> {t.categoryName}
                    </td>
                    <td className="hidden whitespace-nowrap text-muted sm:table-cell">{t.accountName}</td>
                    <td className={`num text-right whitespace-nowrap ${t.direction === "in" ? "text-pos" : "text-neg"}`}>
                      {t.direction === "in" ? "+" : "−"}
                      {fmt(t.amount)}
                    </td>
                    <td className="text-right text-muted">{canWrite && <span aria-hidden>›</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-white p-0 shadow-xl"
        onClick={(e) => e.target === dialogRef.current && close()}
      >
        <TxForm
          key={formKey}
          row={editing}
          categories={categories}
          accounts={accounts}
          today={today}
          canDelete={canDelete}
          onDone={() => {
            close();
            router.refresh();
          }}
          onCancel={close}
          onRefresh={() => router.refresh()}
        />
      </dialog>
    </>
  );
}

function TxForm({
  row,
  categories,
  accounts,
  today,
  canDelete,
  onDone,
  onCancel,
  onRefresh,
}: {
  row: TxRow | null;
  categories: Cat[];
  accounts: Acc[];
  today: string;
  canDelete: boolean;
  onDone: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const [mode, setMode] = useState<Mode>(row ? row.direction : "in");
  const [amount, setAmount] = useState(row ? fmt(row.amount) : "");
  const [state, action, pending] = useActionState<TxState, FormData>(saveTransaction, {});
  const [deleting, startDelete] = useTransition();
  const [delError, setDelError] = useState<string>();
  const [keepOpen, setKeepOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (keepOpen && !row) {
      // simpan & lanjut: kosongkan nominal & keterangan saja
      setAmount("");
      onRefresh();
      const f = formRef.current;
      if (f) {
        (f.elements.namedItem("description") as HTMLInputElement).value = "";
        (f.elements.namedItem("ref") as HTMLInputElement).value = "";
        (f.elements.namedItem("note") as HTMLInputElement).value = "";
        (f.elements.namedItem("description") as HTMLInputElement).focus();
      }
    } else onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.savedAt]);

  const grouped = useMemo(() => {
    const usable = categories.filter((c) => c.active || c.id === row?.categoryId);
    const primary = (c: Cat) => {
      const s = suggestDirection(c.code, c.group);
      return s === null || s === mode;
    };
    const order = GROUP_ORDER.filter((g) => g !== "transfer");
    const main = order
      .map((g) => ({ g, items: usable.filter((c) => c.group === g && primary(c)) }))
      .filter((x) => x.items.length);
    const others = usable.filter((c) => !primary(c) || c.group === "transfer");
    return { main, others };
  }, [categories, mode, row?.categoryId]);

  const activeAccounts = accounts.filter((a) => a.active || a.id === row?.accountId);

  return (
    <form ref={formRef} action={action} className="flex max-h-[90dvh] flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold">{row ? "Ubah transaksi" : "Catat transaksi"}</h2>
        <button type="button" onClick={onCancel} className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink" aria-label="Tutup">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 py-5">
        <input type="hidden" name="id" value={row?.id ?? ""} />
        <input type="hidden" name="mode" value={mode} />

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
          {(
            [
              ["in", "Uang masuk"],
              ["out", "Uang keluar"],
              ["transfer", "Transfer"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              disabled={!!row && m === "transfer"}
              onClick={() => setMode(m)}
              className={`rounded-md px-2 py-1.5 text-sm transition disabled:opacity-40 ${
                mode === m ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" name="date" required defaultValue={row?.date ?? today} className="field" />
          </div>
          <div>
            <label className="label">Nominal (Rp)</label>
            <input
              name="amount"
              inputMode="numeric"
              required
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "");
                setAmount(d ? fmt(Number(d)) : "");
              }}
              className="field num text-right font-medium"
            />
          </div>
        </div>

        {mode === "transfer" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dari akun</label>
              <select name="fromAccountId" required className="field" defaultValue="">
                <option value="" disabled>Pilih…</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ke akun</label>
              <select name="toAccountId" required className="field" defaultValue="">
                <option value="" disabled>Pilih…</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="label">Kategori</label>
              <select name="categoryId" required className="field" defaultValue={row?.categoryId ?? ""}>
                <option value="" disabled>Pilih kategori…</option>
                {grouped.main.map(({ g, items }) => (
                  <optgroup key={g} label={GROUP_LABEL[g]}>
                    {items.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} {c.name}</option>
                    ))}
                  </optgroup>
                ))}
                {grouped.others.length > 0 && (
                  <optgroup label="Lainnya">
                    {grouped.others.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} {c.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="label">{mode === "in" ? "Masuk ke akun" : "Dibayar dari akun"}</label>
              <select name="accountId" required className="field" defaultValue={row?.accountId ?? ""}>
                <option value="" disabled>Pilih akun…</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="label">Keterangan</label>
          <input
            name="description"
            required
            maxLength={300}
            defaultValue={row?.description ?? ""}
            placeholder={mode === "transfer" ? "Mis. Pencairan saldo payment gateway" : "Mis. Order #1024"}
            className="field"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">No. bukti / invoice</label>
            <input name="ref" maxLength={100} defaultValue={row?.ref ?? ""} placeholder="Opsional" className="field" />
          </div>
          <div>
            <label className="label">Catatan</label>
            <input name="note" maxLength={1000} defaultValue={row?.note ?? ""} placeholder="Opsional" className="field" />
          </div>
        </div>

        {mode === "transfer" && (
          <p className="text-xs text-muted">Transfer dicatat jadi 2 baris (keluar & masuk) dengan kategori 0-01, tidak dihitung sebagai omzet atau biaya.</p>
        )}
        {state.error && <p className="text-sm text-neg">{state.error}</p>}
        {delError && <p className="text-sm text-neg">{delError}</p>}
        {state.ok && keepOpen && !row && <p className="text-sm text-pos">Tersimpan. Lanjut catat berikutnya.</p>}
        {row?.createdByName && <p className="text-xs text-muted">Dicatat oleh {row.createdByName}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
        <div>
          {row && canDelete && (
            <button
              type="button"
              disabled={deleting}
              className="btn-danger"
              onClick={() => {
                if (!confirm("Hapus transaksi ini? Tidak bisa dibatalkan.")) return;
                startDelete(async () => {
                  const r = await deleteTransaction(row.id);
                  if (r.error) setDelError(r.error);
                  else onDone();
                });
              }}
            >
              Hapus
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {!row && (
            <button type="submit" disabled={pending} onClick={() => setKeepOpen(true)} className="btn-ghost">
              Simpan & lanjut
            </button>
          )}
          <button type="submit" disabled={pending} onClick={() => setKeepOpen(false)} className="btn-primary">
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </form>
  );
}
