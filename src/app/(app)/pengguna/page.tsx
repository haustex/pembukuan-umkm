import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { Badge, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { createUser, resetPassword, updateUser } from "./actions";

export const metadata = { title: "Pengguna" };

const ROLE_HELP = {
  owner: "Akses penuh: transaksi, hapus, pengaturan, pengguna.",
  staff: "Bisa catat & ubah transaksi, lihat laporan. Tidak bisa hapus atau ubah pengaturan.",
  viewer: "Cuma lihat dan download laporan. Cocok buat konsultan pajak.",
};

export default async function PenggunaPage() {
  const me = await requireUser(["owner"]);
  const list = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, lastLoginAt: users.lastLoginAt })
    .from(users)
    .orderBy(asc(users.id));

  return (
    <>
      <PageHeader title="Pengguna" description="Atur siapa yang bisa login dan apa yang bisa mereka lakukan." />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Tambah pengguna</h2>
          <ActionForm action={createUser} resetOnSuccess className="mt-4 space-y-3" submitLabel="Tambah">
            <div>
              <label className="label">Nama</label>
              <input name="name" required className="field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" required className="field" />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" defaultValue="staff" className="field">
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Password awal</label>
              <input name="password" type="password" minLength={10} required autoComplete="new-password" className="field" />
              <p className="mt-1 text-xs text-muted">Minimal 10 karakter. Minta mereka ganti di menu Akun Saya.</p>
            </div>
          </ActionForm>
          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-xs">
            {(Object.keys(ROLE_HELP) as (keyof typeof ROLE_HELP)[]).map((r) => (
              <div key={r}>
                <dt className="font-medium">{ROLE_LABEL[r]}</dt>
                <dd className="text-muted">{ROLE_HELP[r]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-3 lg:col-span-2">
          {list.map((u) => (
            <div key={u.id} className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {u.name} {u.id === me.id && <Badge>Lo</Badge>} {!u.active && <Badge tone="neg">Nonaktif</Badge>}
                  </div>
                  <div className="text-xs text-muted">
                    {u.email} · login terakhir{" "}
                    {u.lastLoginAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(u.lastLoginAt) : "belum pernah"}
                  </div>
                </div>
              </div>
              <ActionForm action={updateUser} className="flex flex-wrap items-end gap-3" submitClassName="btn-ghost py-1.5">
                <input type="hidden" name="id" value={u.id} />
                <div>
                  <label className="label">Nama</label>
                  <input name="name" defaultValue={u.name} className="field w-48" required />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select name="role" defaultValue={u.role} className="field w-52">
                    {Object.entries(ROLE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={u.active} className="accent-ink" /> Aktif
                </label>
              </ActionForm>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted hover:text-ink">Reset password</summary>
                <ActionForm action={resetPassword} resetOnSuccess className="mt-2 flex flex-wrap items-end gap-3" submitLabel="Set password baru" submitClassName="btn-ghost py-1.5">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder="Password baru" className="field w-60" />
                </ActionForm>
              </details>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
