import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Chamado pelo banco a cada notificação nova: envia para os aparelhos da pessoa.
export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const [{ data: cfg }, { data: pub }] = await Promise.all([
    admin.from("settings").select("value").eq("key", "push").maybeSingle(),
    admin.from("settings").select("value").eq("key", "push_public").maybeSingle(),
  ]);
  if (!cfg?.value?.secret || req.headers.get("x-push-secret") !== cfg.value.secret) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const { data: n } = await admin.from("notifications").select("id,user_id,text,link").eq("id", id).single();
  if (!n) return NextResponse.json({ ok: true, sent: 0 });
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", n.user_id);
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });
  webpush.setVapidDetails("mailto:contato@conectadigii.com.br", pub!.value.key, cfg.value.private);
  const payload = JSON.stringify({ title: "Conecta", body: n.text, url: `/n/${n.id}`, tag: n.id });
  let sent = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); sent++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", s.id); }
  }
  return NextResponse.json({ ok: true, sent });
}
