import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { changePassword } from "./actions";

export const metadata = { title: "Akun Saya" };

export default async function AkunPage() {
  const me = await requireUser();
  return (
    <>
      <PageHeader title="Akun Saya" description={`${me.name} · ${me.email} · ${ROLE_LABEL[me.role]}`} />
      <section className="card max-w-md p-5">
        <h2 className="text-sm font-semibold">Ganti password</h2>
        <ActionForm action={changePassword} resetOnSuccess className="mt-4 space-y-3" submitLabel="Ganti password">
          <div>
            <label className="label">Password lama</label>
            <input name="current" type="password" required autoComplete="current-password" className="field" />
          </div>
          <div>
            <label className="label">Password baru</label>
            <input name="next" type="password" minLength={10} required autoComplete="new-password" className="field" />
          </div>
          <div>
            <label className="label">Ulangi password baru</label>
            <input name="confirm" type="password" minLength={10} required autoComplete="new-password" className="field" />
          </div>
        </ActionForm>
      </section>
    </>
  );
}
