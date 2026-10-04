"use server";
import { redirect } from "next/navigation";
import { getSession, logAction } from "@/lib/session";
import { g, orNull, back } from "@/lib/act";

export async function saveMyProfile(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const me = s.profile.creator_id;
  await s.supabase.from("creators").update({ artist_name: orNull(g(fd, "artist_name")), whatsapp: orNull(g(fd, "whatsapp")), instagram: orNull(g(fd, "instagram")), tiktok: orNull(g(fd, "tiktok")), youtube: orNull(g(fd, "youtube")), clothing_size: orNull(g(fd, "clothing_size")), city: orNull(g(fd, "city")), state: orNull(g(fd, "state")) }).eq("id", me);
  const addr = { creator_id: me, recipient: orNull(g(fd, "recipient")), phone: orNull(g(fd, "phone")), zip: orNull(g(fd, "zip")), street: orNull(g(fd, "street")), number: orNull(g(fd, "number")), complement: orNull(g(fd, "complement")), district: orNull(g(fd, "district")), city: orNull(g(fd, "a_city")), state: orNull(g(fd, "a_state")), updated_at: new Date().toISOString() };
  if (addr.street || addr.zip) {
    const { error } = await s.supabase.from("creator_addresses").upsert(addr);
    if (error) back("/clube/perfil", "Não foi possível salvar o endereço.", false);
  }
  await logAction(s.supabase, s.profile, "atualizou o próprio perfil e endereço", "Perfil", me);
  back("/clube/perfil", "Perfil salvo! Seu endereço só é mostrado para quem for enviar um produto autorizado para você.");
}
