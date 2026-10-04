"use server";
import { getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, back } from "@/lib/act";

export async function saveConfig(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back("/configuracoes", "Só a CEO altera as configurações.", false);
  const admin = createAdminClient();
  const number = g(fd, "whatsapp").replace(/\D/g, "");
  await admin.from("settings").upsert({ key: "whatsapp", value: { number, message: g(fd, "wa_message") }, updated_at: new Date().toISOString() });
  const lq: any = {}; ["hasBudget", "amount", "creators", "affiliates", "agency"].forEach((k) => (lq[k] = !!fd.get(k)));
  await admin.from("settings").upsert({ key: "lead_qs", value: lq, updated_at: new Date().toISOString() });
  await logAction(s.supabase, s.profile!, "alterou as configurações da plataforma (WhatsApp e formulário de leads)", "Configurações", null);
  back("/configuracoes", "Configurações salvas.");
}
