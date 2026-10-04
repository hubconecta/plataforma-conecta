import Icon from "./Icon";
import { createClient } from "@/lib/supabase/server";

// Botão flutuante de WhatsApp. O número vem das Configurações (nunca fixo no código).
export default async function WhatsAppFab() {
  try {
    const { data } = await (await createClient()).from("settings").select("value").eq("key", "whatsapp").maybeSingle();
    const n = String(data?.value?.number || "").replace(/\D/g, "");
    if (!n) return null;
    return <a className="wa-fab" href={`https://wa.me/${n}?text=${encodeURIComponent(data?.value?.message || "Olá, Conecta!")}`} target="_blank" rel="noopener noreferrer" aria-label="Falar com a Conecta no WhatsApp"><Icon name="wa" /></a>;
  } catch { return null; }
}
