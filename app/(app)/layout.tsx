import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AccessLinkBox from "@/components/AccessLinkBox";
import WhatsAppFab from "@/components/WhatsAppFab";
import PushToggle from "@/components/PushToggle";
import { getSession } from "@/lib/session";
import { MENU, MODS, can, ENV, ROLE_LABEL } from "@/lib/perms";

const BNAV: Record<string, string[]> = { ceo: ["ceo", "campanhas", "creators", "marcas"], equipe: ["ops", "campanhas", "creators", "candidaturas"], financeiro: ["fin", "notificacoes"], marca: ["marca_home", "campanhas", "desafios", "relatorios"], creator: ["clube", "oportunidades", "minhas", "meus_desafios"] };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect("/login");
  if (!profile || profile.role === "pendente") redirect("/sem-acesso");
  if (profile.status !== "ativo") redirect("/sem-acesso");
  const pick = (k: string) => { const m = MODS.find((x) => x.key === k)!; return { key: m.key, label: m.label, icon: m.icon, href: m.href, soon: m.soon, sens: m.sens }; };
  const groups = (MENU[profile.role] || []).map(([h, ks]) => [h, ks.filter((k) => can(profile, k)).map(pick)] as [string, any[]]).filter((g) => g[1].length);
  const bottom = (BNAV[profile.role] || []).filter((k) => can(profile, k)).map(pick);
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  const items = MODS.filter((m) => can(profile, m.key)).map((m) => ({ key: m.key, label: m.label, href: m.href }));
  return (
    <div className="shell">
      <Sidebar groups={groups} env={ENV[profile.role]} userName={profile.name || profile.email} userLabel={profile.role === "equipe" && profile.cargo ? profile.cargo : ROLE_LABEL[profile.role]} bottom={bottom} />
      <div className="main">
        <TopBar env={ENV[profile.role]} items={items} unread={count || 0} userId={user.id} />
        <main className="content"><PushToggle compact /><AccessLinkBox />{children}</main>
        {["marca", "creator"].includes(profile.role) ? <WhatsAppFab /> : null}
      </div>
    </div>
  );
}
