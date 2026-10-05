"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, back, notifyProfiles } from "@/lib/act";

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
