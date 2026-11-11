import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, categories, yearlyAdjustments } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/report";
import { currentYear, rp } from "@/lib/format";
import { GROUP_LABEL, GROUP_ORDER, SCHEME_LABEL } from "@/lib/constants";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { ActionForm, DeleteButton } from "@/components/ActionForm";
import { deleteAccount, deleteCategory, saveAccount, saveCategory, setDepreciation, updateSettings } from "./actions";

export const metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  await requireUser(["owner"]);
  const year = currentYear();
  const [s, accs, cats, adj] = await Promise.all([
    getSettings(),
    db.select().from(accounts).orderBy(asc(accounts.sort), asc(accounts.id)),
    db.select().from(categories).orderBy(asc(categories.code)),
    db.select().from(yearlyAdjustments).where(eq(yearlyAdjustments.year, year)),
  ]);

  return (
    <>
      <PageHeader title="Pengaturan" description="Skema pajak, akun kas, dan kategori. Hanya owner yang bisa mengubah." />

      <div className="space-y-6">
        <Section title="Usaha & skema pajak">
          <ActionForm action={updateSettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama usaha">
                <input name="businessName" defaultValue={s.businessName} className="field" required />
              </Field>
              <Field label="Tanggal mulai pembukuan" hint="Saldo awal akun berlaku per tanggal ini.">
                <input type="date" name="startDate" defaultValue={s.startDate} className="field" required />
              </Field>
              <Field label="Skema pajak" className="sm:col-span-2">
                <select name="taxScheme" defaultValue={s.taxScheme} className="field">
                  {Object.entries(SCHEME_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tarif PPh Final UMKM (%)">
                <input name="finalRate" defaultValue={String(s.finalRateBp / 100).replace(".", ",")} className="field" inputMode="decimal" />
              </Field>
              <Field label="Omzet bebas PPh Final — khusus Orang Pribadi (Rp)">
                <input name="opExemptAmount" defaultValue={rp(s.opExemptAmount)} className="field num" inputMode="numeric" />
              </Field>
              <Field label="Tarif PPh Badan (%)">
                <input name="corpRate" defaultValue={String(s.corpRateBp / 100).replace(".", ",")} className="field" inputMode="decimal" />
              </Field>
              <Field label="Batas omzet fasilitas Pasal 31E (Rp)">
                <input name="facilityLimit" defaultValue={rp(s.facilityLimit)} className="field num" inputMode="numeric" />
              </Field>
            </div>
            <Notice>
              PP 20/2026 (berlaku 22 April 2026): PPh Final 0,5% hanya untuk Orang Pribadi, PT Perorangan, dan koperasi. PT biasa/CV yang terdaftar
              mulai 22 April 2026 pakai tarif umum PPh Badan dengan fasilitas Pasal 31E.
            </Notice>
          </ActionForm>
        </Section>

        <Section title={`Penyusutan aset tetap ${year}`} description="Diisi sekali di akhir tahun, dari daftar aset (kategori 1-01). Masuk ke laba rugi.">
          <ActionForm action={setDepreciation} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="year" value={year} />
            <Field label="Nilai penyusutan (Rp)">
              <input name="depreciation" defaultValue={rp(adj[0]?.depreciation ?? 0)} className="field num w-56" inputMode="numeric" />
            </Field>
          </ActionForm>
        </Section>

        <Section title="Akun kas & bank" description="Saldo awal = saldo per tanggal mulai pembukuan.">
          <div className="space-y-2">
            <div className="hidden grid-cols-12 gap-3 px-1 text-xs font-medium text-muted sm:grid">
              <div className="col-span-4">Nama akun</div>
              <div className="col-span-3">Saldo awal (Rp)</div>
              <div className="col-span-1">Urutan</div>
              <div className="col-span-4">Status</div>
            </div>
            {accs.map((a) => (
              <ActionForm key={a.id} action={saveAccount} className="grid grid-cols-2 items-center gap-3 border-b border-line pb-2 sm:grid-cols-12" submitClassName="btn-ghost py-1.5" footerClassName="sm:col-span-2">
                <input type="hidden" name="id" value={a.id} />
                <input name="name" defaultValue={a.name} className="field col-span-2 sm:col-span-4" required />
                <input name="openingBalance" defaultValue={rp(a.openingBalance)} className="field num sm:col-span-3" inputMode="numeric" />
                <input name="sort" type="number" defaultValue={a.sort} className="field sm:col-span-1" />
                <label className="flex items-center gap-2 text-sm sm:col-span-1">
                  <input type="checkbox" name="active" defaultChecked={a.active} className="accent-ink" /> Aktif
                </label>
                <span className="sm:col-span-1">
                  <DeleteButton action={deleteAccount.bind(null, a.id)} confirmText={`Hapus akun ${a.name}?`} />
                </span>
              </ActionForm>
            ))}
            <ActionForm action={saveAccount} resetOnSuccess className="grid grid-cols-2 items-center gap-3 pt-2 sm:grid-cols-12" submitLabel="+ Tambah akun" submitClassName="btn-primary py-1.5 whitespace-nowrap" footerClassName="col-span-2 sm:col-span-4">
              <input name="name" placeholder="Nama akun baru, mis. BCA" className="field col-span-2 sm:col-span-4" required />
              <input name="openingBalance" placeholder="Saldo awal" className="field num sm:col-span-3" inputMode="numeric" />
              <input name="sort" type="number" defaultValue={accs.length} className="field sm:col-span-1" />
            </ActionForm>
          </div>
        </Section>

        <Section title="Kategori" description="Kode menentukan kelompok laporan. Kategori yang sudah dipakai tidak bisa dihapus, cukup dinonaktifkan.">
          <details className="mb-4 rounded-lg border border-line p-4">
            <summary className="cursor-pointer text-sm font-medium">+ Tambah kategori</summary>
            <ActionForm action={saveCategory} resetOnSuccess className="mt-4 space-y-3">
              <CategoryFields />
            </ActionForm>
          </details>
          <div className="divide-y divide-line">
            {GROUP_ORDER.map((g) => {
              const items = cats.filter((c) => c.group === g);
              if (!items.length) return null;
              return (
                <div key={g} className="py-3">
                  <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{GROUP_LABEL[g]}</div>
                  {items.map((c) => (
                    <details key={c.id} className="group rounded-lg px-2 py-1.5 hover:bg-surface open:bg-surface">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                        <span>
                          <span className="num text-muted">{c.code}</span> {c.name}{" "}
                          {!c.active && <Badge>Nonaktif</Badge>} {c.finalTaxed && <Badge tone="warn">PPh final</Badge>}
                        </span>
                        <span className="text-xs text-muted group-open:hidden">Ubah</span>
                      </summary>
                      <ActionForm action={saveCategory} className="mt-3 space-y-3 pb-2">
                        <input type="hidden" name="id" value={c.id} />
                        <CategoryFields c={c} />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="active" defaultChecked={c.active} className="accent-ink" /> Aktif
                          </label>
                          <DeleteButton action={deleteCategory.bind(null, c.id)} confirmText={`Hapus kategori ${c.code} ${c.name}?`} />
                        </div>
                      </ActionForm>
                    </details>
                  ))}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </>
  );
}

function CategoryFields({ c }: { c?: typeof categories.$inferSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Kode" className="sm:col-span-1">
        <input name="code" defaultValue={c?.code} placeholder="6-14" className="field num" required />
      </Field>
      <Field label="Nama" className="sm:col-span-3">
        <input name="name" defaultValue={c?.name} className="field" required />
      </Field>
      <Field label="Kelompok" className="sm:col-span-2">
        <select name="group" defaultValue={c?.group ?? "beban"} className="field">
          {GROUP_ORDER.map((g) => (
            <option key={g} value={g}>{GROUP_LABEL[g]}</option>
          ))}
        </select>
      </Field>
      <Field label="Keterangan" className="sm:col-span-4">
        <input name="description" defaultValue={c?.description} className="field" />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
        <input type="checkbox" name="finalTaxed" defaultChecked={c?.finalTaxed} className="accent-ink" /> Sudah kena PPh final
      </label>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
