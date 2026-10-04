"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, requireModule, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/perms";
import { g, orNull, back } from "@/lib/act";

const own = (path: string | null, prefix: string) => (path && path.startsWith(prefix + "/") ? path : null);

// Perfil de quem usa a plataforma (equipe, CEO, marca)
export async function saveMyProfile(fd: FormData) {
  const s = await getSession();
  if (!s.user || !s.profile) redirect("/login");
  const path = g(fd, "back") || "/perfil";
  const staff = ["ceo", "equipe", "financeiro"].includes(s.profile.role);
  const av = orNull(g(fd, "avatar_path"));
  const row: any = { name: g(fd, "name") || s.profile.name, whatsapp: orNull(g(fd, "whatsapp")), instagram: orNull(g(fd, "instagram")), bio: orNull(g(fd, "bio")), avatar_path: staff ? av : own(av, s.profile.id) };
  if (staff) row.cargo = orNull(g(fd, "cargo"));
  const { error } = await s.supabase.from("profiles").update(row).eq("id", s.user.id);
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  revalidatePath("/", "layout");
  back(path, "Perfil salvo.");
}

// Perfil da marca: a própria marca edita a apresentação e o logo
export async function saveBrandProfile(fd: FormData) {
  const s = await getSession();
  if (!s.profile) redirect("/login");
  const isBrand = s.profile.role === "marca";
  const id = isBrand ? s.profile.brand_id : g(fd, "brand_id");
  if (!id || (!isBrand && !can(s.profile, "marcas"))) back("/", "Sem permissão.", false);
  const logo = orNull(g(fd, "logo_path"));
  const row = { logo_path: isBrand ? own(logo, s.profile.id) : logo, description: orNull(g(fd, "description")), site: orNull(g(fd, "site")), instagram: orNull(g(fd, "instagram")), tiktok: orNull(g(fd, "tiktok")), contact_name: orNull(g(fd, "contact_name")), email: orNull(g(fd, "email")), whatsapp: orNull(g(fd, "whatsapp")) };
  const { error } = await createAdminClient().from("brands").update(row).eq("id", id);
  if (error) back(isBrand ? "/portal/perfil" : `/marcas/${id}`, error.message, false);
  await logAction(s.supabase, s.profile, `atualizou o perfil da marca`, "Marcas", id);
  revalidatePath("/", "layout");
  back(isBrand ? "/portal/perfil" : `/marcas/${id}`, "Perfil da marca salvo.");
}

// Arquivos da creator (media kit, relatório de vendas…)
export async function addCreatorFile(fd: FormData) {
  const s = await getSession();
  if (!s.profile) redirect("/login");
  const staff = can(s.profile, "creators");
  const cid = staff && g(fd, "creator_id") ? g(fd, "creator_id") : s.profile.creator_id;
  const path = g(fd, "path"), back_ = g(fd, "back") || "/clube/perfil";
  if (!cid || !path) back(back_, "Envie o arquivo antes de salvar.", false);
  if (!staff && !path.startsWith(`creator-${cid}/`)) back(back_, "Arquivo inválido.", false);
  const { error } = await s.supabase.from("creator_files").insert({ creator_id: cid, kind: g(fd, "kind") || "Media kit", title: g(fd, "title") || g(fd, "kind") || "Arquivo", path });
  if (error) back(back_, error.message, false);
  await logAction(s.supabase, s.profile, `adicionou ${g(fd, "kind") || "arquivo"} ao perfil da creator`, "Creators", cid);
  back(back_, "Arquivo adicionado ao perfil.");
}

export async function deleteCreatorFile(fd: FormData) {
  const s = await getSession();
  if (!s.profile) redirect("/login");
  const { data: f } = await s.supabase.from("creator_files").select("path").eq("id", g(fd, "id")).single();
  const { error } = await s.supabase.from("creator_files").delete().eq("id", g(fd, "id"));
  if (!error && f?.path) await createAdminClient().storage.from("docs").remove([f.path]);
  back(g(fd, "back") || "/clube/perfil", error ? error.message : "Arquivo removido.", !error);
}

// Grupos de WhatsApp gerais (comunidade)
export async function saveCommunityLink(fd: FormData) {
  const { supabase, profile } = await requireModule("campanhas");
  if (profile.role === "marca") back("/", "Sem permissão.", false);
  const url = g(fd, "url");
  if (!/^https?:\/\//.test(url)) back("/configuracoes", "Cole o link completo do grupo (https://chat.whatsapp.com/…).", false);
  const { error } = await supabase.from("community_links").insert({ title: g(fd, "title") || "Comunidade Conecta", url, audience: g(fd, "audience") || "Creators" });
  if (error) back(g(fd, "back") || "/configuracoes", error.message, false);
  await logAction(supabase, profile, `adicionou o grupo ${g(fd, "title")}`, "Comunidade", null);
  back(g(fd, "back") || "/configuracoes", "Grupo adicionado. Ele aparece no início de quem tem acesso.");
}
export async function deleteCommunityLink(fd: FormData) {
  const { supabase } = await requireModule("campanhas");
  await supabase.from("community_links").delete().eq("id", g(fd, "id"));
  back(g(fd, "back") || "/configuracoes", "Grupo removido.");
}
