import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processB4Event } from "@/lib/b4";

// Recebe os avisos (webhooks) da B4YOU. Configure na B4YOU (Apps > Webhooks) a URL mostrada em Club Criadora (admin).
// Todo aviso é guardado e processado na hora: pagamento aprovado + produto cadastrado + e-mail da creator = acesso liberado.
export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const { data: cfg } = await admin.from("settings").select("value").eq("key", "b4you").maybeSingle();
  const token = req.nextUrl.searchParams.get("token") || req.headers.get("x-webhook-token") || "";
  if (!cfg?.value?.token || token !== cfg.value.token) return NextResponse.json({ ok: false }, { status: 401 });
  const raw = await req.text();
  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { payload = Object.fromEntries(new URLSearchParams(raw)); }
  const { data: ev } = await admin.from("b4_events").insert({ payload, status: "Recebido" }).select("id").single();
  const status = ev ? await processB4Event(admin, ev.id) : "erro";
  return NextResponse.json({ ok: true, status });
}

// Teste de conexão (algumas plataformas chamam com GET ao salvar o webhook)
export async function GET() { return NextResponse.json({ ok: true }); }
