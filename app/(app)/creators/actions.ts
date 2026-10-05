"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, back } from "@/lib/act";

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
