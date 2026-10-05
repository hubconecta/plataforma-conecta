"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, notifyModule } from "@/lib/act";
import { NICHES, CREATOR_PROFILES } from "@/lib/consts";

// Creator "só da marca" pede para entrar no Clube Conecta completo: entra na hora.
export async function joinClube(fd: FormData) {
  const s = await getSession();
  if (!s.profile || s.profile.role !== "creator" || !s.profile.creator_id) redirect("/login");
  if (!fd.get("aceite")) redirect("/clube?erro=" + encodeURIComponent("Marque que você quer fazer parte da comunidade Conecta."));
  const kind = g(fd, "kind"), niche = g(fd, "niche"), why = g(fd, "why").slice(0, 500);
  const admin = createAdminClient();
  const { data: c } = await admin.from("creators").select("name,brand_only,kind,niche").eq("id", s.profile.creator_id).single();
  if (!c) redirect("/clube");
  const upd: any = { brand_only: false };
  if (CREATOR_PROFILES.includes(kind)) upd.kind = kind;
  if (NICHES.includes(niche)) upd.niche = niche;
  await admin.from("creators").update(upd).eq("id", s.profile.creator_id);
  await notifyModule(admin, "creators", `🎉 ${c.name} entrou no Clube Conecta${why ? `: "${why.slice(0, 120)}"` : ""}`, `/creators/${s.profile.creator_id}`);
  await admin.from("notifications").insert({ user_id: s.profile.id, text: "🎉 Bem-vinda ao Clube Conecta! Agora você vê todas as oportunidades, desafios e conteúdos.", link: "/clube" });
  revalidatePath("/", "layout");
  redirect("/clube?ok=" + encodeURIComponent("Bem-vinda ao Clube Conecta! 💖 Agora você tem acesso a tudo."));
}
