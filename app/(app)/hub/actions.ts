"use server";
import { redirect } from "next/navigation";
import { requireModule, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { back } from "@/lib/act";
import { hubSettings } from "@/lib/hub";

// "QUERO FAZER PARTE DO CONECTA HUB": registra a intenção (pendente) e leva ao checkout da B4YOU.
// O acesso só é liberado quando a B4YOU confirma o pagamento pelo webhook, nunca pela volta do checkout.
export async function startHubCheckout() {
  const { supabase, profile } = await requireModule("hub");
  if (!profile.creator_id) back("/hub", "Seu acesso ainda não está ligado a um cadastro de creator. Fale com a equipe Conecta.", false);
  const admin = createAdminClient();
  const cfg = await hubSettings(admin);
  const { data: cur } = await admin.from("subscriptions").select("id,status").eq("creator_id", profile.creator_id).eq("plan_code", "hub").maybeSingle();
  if ((profile as any).hub) back("/hub", "Você já faz parte do Conecta Hub. 💖");
  if (!(profile as any).hubVisible) back("/clube", "O Conecta Hub ainda não está disponível.", false);
  const { data: cr } = await admin.from("creators").select("email").eq("id", profile.creator_id).single();
  const email = (cr?.email || profile.email || "").toLowerCase() || null;
  if (!cur) await admin.from("subscriptions").insert({ creator_id: profile.creator_id, plan_code: "hub", status: "pendente", email });
  else if (["pendente", "expirada", "reembolsada"].includes(cur.status)) await admin.from("subscriptions").update({ status: "pendente", email, updated_at: new Date().toISOString() }).eq("id", cur.id);
  await logAction(supabase, profile, "iniciou a assinatura do Conecta Hub", "Conecta Hub", profile.creator_id);
  if (!cfg.checkout_url || !/^https:\/\//.test(cfg.checkout_url)) back("/hub", "As assinaturas abrem em breve! A equipe Conecta já sabe do seu interesse. 💖", false);
  redirect(cfg.checkout_url);
}
