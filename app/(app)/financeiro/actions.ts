"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, orNull, num, back, notifyProfiles, today } from "@/lib/act";
import { brlFull, reminderText, kindFor, daysTo } from "@/lib/fin";

const P = (fd: FormData) => g(fd, "back") || "/financeiro";

export async function saveEntry(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const id = g(fd, "id");
  const row: any = { kind: g(fd, "kind") === "pagar" ? "pagar" : "receber", description: g(fd, "description"), ref: orNull(g(fd, "ref")), party: orNull(g(fd, "party")), brand_id: orNull(g(fd, "brand_id")), category: orNull(g(fd, "category")), value: num(fd, "value") || 0, due: orNull(g(fd, "due")) };
  if (!row.description || !row.due) back(P(fd), "Informe a descrição e o vencimento.", false);
  if (row.brand_id && !row.party) { const { data: b } = await supabase.from("brands").select("name").eq("id", row.brand_id).single(); row.party = b?.name || null; }
  if (!id) row.created_by = profile.id;
  const { error } = id ? await supabase.from("fin_entries").update(row).eq("id", id) : await supabase.from("fin_entries").insert(row);
  if (error) back(P(fd), "Não foi possível salvar: " + error.message, false);
  await logAction(supabase, profile, `${id ? "editou" : "lançou"} conta a ${row.kind} "${row.description}" de ${brlFull(row.value)}`, "Financeiro", id || null, true);
  revalidatePath("/financeiro");
  back(P(fd), "Lançamento salvo.");
}

export async function payEntry(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const id = g(fd, "id");
  const { data: e } = await supabase.from("fin_entries").update({ status: "Pago", paid_at: orNull(g(fd, "paid_at")) || today() }).eq("id", id).select("*").single();
  if (!e) back(P(fd), "Lançamento não encontrado.", false);
  if (e.kind === "receber" && e.brand_id) await notifyProfiles(supabase, { brand_id: e.brand_id }, `Pagamento confirmado: ${e.description} (${brlFull(e.value)}). Obrigada!`, "/portal/financeiro");
  await logAction(supabase, profile, `marcou como pago "${e.description}" (${brlFull(e.value)})`, "Financeiro", id, true);
  revalidatePath("/financeiro");
  back(P(fd), "Marcado como pago.");
}

export async function cancelEntry(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const id = g(fd, "id");
  const { data: e } = await supabase.from("fin_entries").update({ status: g(fd, "reopen") ? "Em aberto" : "Cancelado", paid_at: null }).eq("id", id).select("description").single();
  await logAction(supabase, profile, `${g(fd, "reopen") ? "reabriu" : "cancelou"} o lançamento "${e?.description}"`, "Financeiro", id, true);
  back(P(fd), g(fd, "reopen") ? "Lançamento reaberto." : "Lançamento cancelado.");
}

// Gera as mensalidades do mês para as marcas com contrato (sem duplicar)
export async function generateMonthly(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const month = g(fd, "month") || today().slice(0, 7);
  const [{ data: cs }, { data: brands }, { data: ex }] = await Promise.all([
    supabase.from("brand_contracts").select("*"),
    supabase.from("brands").select("id,name,status").in("status", ["Ativa", "Negociação", "Pausada"]),
    supabase.from("fin_entries").select("brand_id,ref").eq("kind", "receber").eq("ref", `Mensalidade ${month}`),
  ]);
  const has = new Set((ex || []).map((e: any) => e.brand_id));
  const rows = (brands || []).filter((b: any) => b.status === "Ativa" && !has.has(b.id)).map((b: any) => { const c = (cs || []).find((x: any) => x.brand_id === b.id); if (!c?.monthly_value) return null; const day = Math.min(28, Math.max(1, Number(c.due_day) || 10)); return { kind: "receber", description: `Gestão Conecta · ${b.name}`, ref: `Mensalidade ${month}`, party: b.name, brand_id: b.id, category: "Gestão", value: c.monthly_value, due: `${month}-${String(day).padStart(2, "0")}`, created_by: profile.id }; }).filter(Boolean);
  if (rows.length) await supabase.from("fin_entries").insert(rows);
  await logAction(supabase, profile, `gerou ${rows.length} mensalidade(s) de ${month}`, "Financeiro", null, true);
  back(P(fd), rows.length ? `${rows.length} cobrança(s) de ${month} criadas a partir dos contratos.` : "Nenhuma cobrança nova: todas as marcas ativas com contrato já têm a mensalidade deste mês.");
}

export async function sendReminder(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const id = g(fd, "fin_id"), channel = g(fd, "channel") || "Plataforma";
  const { data: e } = await supabase.from("fin_entries").select("*, brands(name,whatsapp,phone)").eq("id", id).single();
  if (!e?.brand_id) back(P(fd), "Esta cobrança não está ligada a uma marca.", false);
  const msg = g(fd, "message") || reminderText(kindFor(e.due, today()), e.brands?.name || "", e, Math.max(0, daysTo(e.due, today())));
  await notifyProfiles(supabase, { brand_id: e.brand_id }, `💳 ${msg}`, "/portal/financeiro");
  await supabase.from("reminder_log").insert({ who: profile.name, brand_id: e.brand_id, fin_id: id, message: msg, channel, status: channel === "WhatsApp" ? "Registrado" : "Enviado", mode: "Manual", kind: kindFor(e.due, today()) });
  await logAction(supabase, profile, `enviou lembrete de pagamento para ${e.brands?.name} (${channel})`, "Cobranças", id, true);
  back(P(fd), channel === "WhatsApp" ? "Lembrete registrado e enviado na plataforma. Abra o WhatsApp pelo botão para mandar a mensagem." : "Lembrete enviado no portal da marca.");
}

export async function saveRemSettings(fd: FormData) {
  const { profile, supabase } = await requireModule("fin");
  const value = { before: Math.min(30, Math.max(1, Number(g(fd, "before")) || 3)), onDay: !!fd.get("onDay"), after: Math.max(1, Number(g(fd, "after")) || 2), plataforma: true, email: false, ativo: !!fd.get("ativo") };
  await createAdminClient().from("settings").upsert({ key: "rem", value, updated_at: new Date().toISOString() });
  await logAction(supabase, profile, "alterou os lembretes automáticos de pagamento", "Cobranças", null, true);
  back(P(fd), "Lembretes automáticos salvos.");
}

export async function saveSale(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const row: any = { creator_id: orNull(g(fd, "creator_id")), campaign_id: orNull(g(fd, "campaign_id")), brand_id: orNull(g(fd, "brand_id")), product: g(fd, "product"), sold: num(fd, "sold") || 0, creator_pct: num(fd, "creator_pct") || 0, conecta_pct: num(fd, "conecta_pct") || 0, rule: g(fd, "rule") || "Produto", status: g(fd, "status") || "Pendente", sale_date: orNull(g(fd, "sale_date")) || today(), source: "Manual" };
  if (!row.product || !row.sold) back(P(fd), "Informe o produto e o valor vendido.", false);
  if (row.campaign_id && !row.brand_id) { const { data: c } = await supabase.from("campaigns").select("brand_id").eq("id", row.campaign_id).single(); row.brand_id = c?.brand_id || null; }
  const { error } = await supabase.from("sales").insert(row);
  if (error) back(P(fd), error.message, false);
  await logAction(supabase, profile, `registrou venda de ${row.product} (${brlFull(row.sold)})`, "Vendas", null, true);
  back(P(fd), "Venda registrada.");
}

export async function setSaleStatus(fd: FormData) {
  const { supabase, profile } = await requireModule("fin");
  const ids = fd.getAll("id").map(String), status = g(fd, "status");
  const { data: ss } = await supabase.from("sales").update({ status }).in("id", ids).select("creator_id,sold,creator_pct,product");
  for (const s of ss || []) if (s.creator_id && ["Liberada", "Paga"].includes(status)) await notifyProfiles(supabase, { creator_id: s.creator_id }, `${status === "Paga" ? "💰 Comissão paga" : "Comissão liberada"}: ${brlFull((s.sold * s.creator_pct) / 100)} · ${s.product}`, "/clube/comissoes");
  await logAction(supabase, profile, `marcou ${ids.length} venda(s) como ${status}`, "Vendas", null, true);
  back(P(fd), `${ids.length} venda(s): ${status}.`);
}
