"use server";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { can } from "@/lib/perms";
import { g, back, notifyProfiles, notifyCreators } from "@/lib/act";

// Muda a creator entre "só da marca" e "base completa da Conecta"
export async function setCreatorBase(fd: FormData) {
  const { supabase, profile } = await requireModule("creators");
  const id = g(fd, "creator_id"), full = g(fd, "full") === "1";
  const { data: c } = await supabase.from("creators").select("name").eq("id", id).single();
  const { error } = await supabase.from("creators").update({ brand_only: !full }).eq("id", id);
  if (error) back(`/creators/${id}`, "Não foi possível alterar: " + error.message, false);
  await logAction(supabase, profile, full ? `colocou ${c?.name || "a creator"} na base completa da Conecta` : `deixou ${c?.name || "a creator"} só com as marcas dela`, "Creators", id);
  revalidatePath("/creators", "layout");
  back(`/creators/${id}`, full ? "Agora ela tem o Clube Conecta completo." : "Agora ela vê só os desafios das marcas dela.");
}

// Coloca a creator na base de uma marca (ou tira), pela equipe.
export async function addCreatorBrand(fd: FormData) {
  const { supabase, profile } = await requireModule("creators");
  const creator = g(fd, "creator_id"), brand = g(fd, "brand_id"), path = g(fd, "back") || `/creators/${creator}`;
  if (!creator || !brand) back(path, "Escolha a marca.", false);
  const { error } = await supabase.from("creator_brands").upsert({ creator_id: creator, brand_id: brand, source: "Equipe" }, { onConflict: "creator_id,brand_id", ignoreDuplicates: true });
  if (error) back(path, "Não foi possível adicionar: " + error.message, false);
  const [{ data: c }, { data: b }] = await Promise.all([supabase.from("creators").select("name").eq("id", creator).single(), supabase.from("brands").select("name").eq("id", brand).single()]);
  await notifyProfiles(supabase, { creator_id: creator }, `💖 Você agora faz parte da base de creators da ${b?.name || "marca"}`, "/clube/marcas");
  await logAction(supabase, profile, `colocou ${c?.name || "a creator"} na base da marca ${b?.name || ""}`, "Creators", creator);
  revalidatePath("/creators", "layout"); revalidatePath("/marcas", "layout");
  back(path, `${c?.name || "Creator"} agora está na base da ${b?.name || "marca"}.`);
}

export async function removeCreatorBrand(fd: FormData) {
  const { supabase, profile } = await requireModule("creators");
  const creator = g(fd, "creator_id"), brand = g(fd, "brand_id"), path = g(fd, "back") || `/creators/${creator}`;
  const [{ data: c }, { data: b }] = await Promise.all([supabase.from("creators").select("name").eq("id", creator).single(), supabase.from("brands").select("name").eq("id", brand).single()]);
  await supabase.from("creator_brands").delete().eq("creator_id", creator).eq("brand_id", brand);
  await logAction(supabase, profile, `tirou ${c?.name || "a creator"} da base da marca ${b?.name || ""}`, "Creators", creator);
  revalidatePath("/creators", "layout"); revalidatePath("/marcas", "layout");
  back(path, `${c?.name || "Creator"} saiu da base da ${b?.name || "marca"}.`);
}

// Grupos de WhatsApp da marca (comunidade da marca, afiliação, campanha…)
export async function saveBrandLink(fd: FormData) {
  const s = await getSession();
  const brand = g(fd, "brand_id"), path = `/marcas/${brand}`;
  if (!s.profile || !(can(s.profile, "marcas") || can(s.profile, "campanhas"))) back(path, "Sem permissão.", false);
  const url = g(fd, "url");
  if (!/^https?:\/\//.test(url)) back(path, "Cole o link completo do grupo (https://chat.whatsapp.com/…).", false);
  const kinds = ["Comunidade da marca", "Afiliação", "Campanha", "Outro"];
  const kind = kinds.includes(g(fd, "kind")) ? g(fd, "kind") : "Comunidade da marca";
  const { error } = await s.supabase.from("brand_links").insert({ brand_id: brand, title: g(fd, "title") || kind, url, kind });
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  // avisa as creators da base da marca
  const { data: cbs } = await s.supabase.from("creator_brands").select("creator_id").eq("brand_id", brand);
  const { data: b } = await s.supabase.from("brands").select("name").eq("id", brand).single();
  if (cbs?.length) await notifyCreators(s.supabase, `💬 Novo grupo da ${b?.name || "marca"} no WhatsApp: ${g(fd, "title") || kind}`, "/clube/marcas", cbs.map((x: any) => x.creator_id));
  await logAction(s.supabase, s.profile!, `adicionou o grupo ${g(fd, "title") || kind} na marca ${b?.name || ""}`, "Marcas", brand);
  revalidatePath("/marcas", "layout");
  back(path, "Grupo adicionado. As creators da marca já veem e foram avisadas.");
}

export async function deleteBrandLink(fd: FormData) {
  const s = await getSession();
  const brand = g(fd, "brand_id"), path = `/marcas/${brand}`;
  if (!s.profile || !(can(s.profile, "marcas") || can(s.profile, "campanhas"))) back(path, "Sem permissão.", false);
  await s.supabase.from("brand_links").delete().eq("id", g(fd, "id"));
  revalidatePath("/marcas", "layout");
  back(path, "Grupo removido da plataforma.");
}
