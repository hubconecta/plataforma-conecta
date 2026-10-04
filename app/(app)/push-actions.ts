"use server";
import webpush from "web-push";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Garante as chaves do push (criadas uma única vez) e devolve a chave pública para o aparelho.
export async function pushKey() {
  const { user } = await getSession();
  if (!user) return { error: "Faça login de novo." };
  const admin = createAdminClient();
  let { data: pub } = await admin.from("settings").select("value").eq("key", "push_public").maybeSingle();
  const { data: priv } = await admin.from("settings").select("value").eq("key", "push").maybeSingle();
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL || `https://${h.get("host")}`;
  if (!pub?.value?.key || !priv?.value?.private) {
    const k = webpush.generateVAPIDKeys();
    const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await admin.from("settings").upsert([{ key: "push_public", value: { key: k.publicKey } }, { key: "push", value: { private: k.privateKey, secret, url: `${site}/api/push` } }]);
    return { key: k.publicKey };
  }
  if (priv.value.url !== `${site}/api/push`) await admin.from("settings").update({ value: { ...priv.value, url: `${site}/api/push` } }).eq("key", "push");
  return { key: pub.value.key as string };
}

export async function savePushSub(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, device: string) {
  const { supabase, user } = await getSession();
  if (!user) return { error: "Faça login de novo." };
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, device: device.slice(0, 120) });
  if (error) return { error: error.message };
  await supabase.from("notifications").insert({ user_id: user.id, text: "🔔 Notificações ativadas neste aparelho!", link: "/notificacoes" });
  return { ok: true };
}

export async function removePushSub(endpoint: string) {
  const { supabase, user } = await getSession();
  if (!user) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
