"use client";

import { useActionState, useTransition, useState } from "react";

type State = { ok?: boolean; error?: string; at?: number };

/** Form generik untuk server action yang mengembalikan {ok, error}. */
export function ActionForm({
  action,
  children,
  className,
  submitLabel = "Simpan",
  submitClassName = "btn-primary",
  resetOnSuccess,
  inlineStatus = true,
  footerClassName = "",
}: {
  action: (s: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
  inlineStatus?: boolean;
  footerClassName?: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(async (s, fd) => {
    const r = await action(s, fd);
    return r;
  }, {});
  return (
    <form
      action={formAction}
      className={className}
      key={resetOnSuccess && state.ok ? state.at : undefined}
    >
      {children}
      <div className={`flex items-center gap-3 ${footerClassName}`}>
        <button disabled={pending} className={submitClassName}>
          {pending ? "Menyimpan…" : submitLabel}
        </button>
        {inlineStatus && state.error && <span className="text-sm text-neg">{state.error}</span>}
        {inlineStatus && state.ok && !pending && <span className="text-sm text-pos">Tersimpan</span>}
      </div>
    </form>
  );
}

export function DeleteButton({ action, confirmText, label = "Hapus" }: { action: () => Promise<State>; confirmText: string; label?: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="text-sm text-neg hover:underline disabled:opacity-50"
        onClick={() => {
          if (!confirm(confirmText)) return;
          start(async () => {
            const r = await action();
            setErr(r.error);
          });
        }}
      >
        {label}
      </button>
      {err && <span className="text-xs text-neg">{err}</span>}
    </span>
  );
}
