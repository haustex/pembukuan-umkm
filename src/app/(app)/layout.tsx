import Nav from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { logout } from "../login/actions";
import { brandName } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <Nav brand={brandName()} isOwner={user.role === "owner"} user={{ name: user.name, roleLabel: ROLE_LABEL[user.role] }} logoutAction={logout} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
