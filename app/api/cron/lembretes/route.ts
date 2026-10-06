import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reminderText, daysTo } from "@/lib/fin";
import { classAudience } from "@/lib/classes";

// Lembretes automáticos de pagamento: a Vercel chama todo dia (ver vercel.json).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createAdminClient();
  // Lembrete das aulas/lives de hoje (horário de Brasília)
  let aulas = 0;
  try {
    const d0 = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const { data: cls } = await admin.from("classes").select("*, brands(name)").eq("status", "Agendada").gte("starts_at", `${d0}T00:00:00-03:00`).lte("starts_at", `${d0}T23:59:59-03:00`);
    for (const c of cls || []) {
      const ids = await classAudience(admin, c);
      const h = new Date(c.starts_at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
      for (let i = 0; i < ids.length; i += 500) await admin.from("notifications").insert(ids.slice(i, i + 500).map((u) => ({ user_id: u, text: `⏰ Hoje às ${h} tem aula${c.brands?.name ? ` da ${c.brands.name}` : ""}: ${c.title}`, link: "/aulas" })));
      aulas++;
    }
  } catch {}
  const { data: cfg } = await admin.from("settings").select("value").eq("key", "rem").maybeSingle();
  const R = cfg?.value || { before: 3, onDay: true, after: 2 };
  if (R.ativo === false) return NextResponse.json({ ok: true, sent: 0, off: true, aulas });
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const { data: open } = await admin.from("fin_entries").select("*, brands(name)").eq("kind", "receber").eq("status", "Em aberto").not("brand_id", "is", null);
  let sent = 0;
  for (const e of open || []) {
    if (!e.due) continue;
    const d = daysTo(e.due, today);
    const kind = d === Number(R.before) ? "antes" : d === 0 && R.onDay ? "dia" : d < 0 && -d >= Number(R.after) ? "depois" : null;
    if (!kind) continue;
    const { data: done } = await admin.from("reminder_log").select("id").eq("fin_id", e.id).eq("kind", kind).eq("mode", "Automático").limit(1);
    if (done?.length) continue;
    const msg = reminderText(kind, e.brands?.name || "", e, Math.max(0, d));
    const { data: ps } = await admin.from("profiles").select("id").eq("brand_id", e.brand_id).eq("role", "marca").eq("status", "ativo");
    if (ps?.length) await admin.from("notifications").insert(ps.map((p: any) => ({ user_id: p.id, text: `💳 ${msg}`, link: "/portal/financeiro" })));
    await admin.from("reminder_log").insert({ who: "Sistema", brand_id: e.brand_id, fin_id: e.id, message: msg, channel: "Plataforma", status: "Enviado", mode: "Automático", kind });
    sent++;
  }
  return NextResponse.json({ ok: true, sent, aulas });
}
