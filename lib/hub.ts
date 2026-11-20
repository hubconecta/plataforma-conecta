// CONECTA HUB · regras da assinatura (servidor).
// Toda mudança de status passa por aqui: pagamento, renovação, atraso, cancelamento,
// reembolso, expiração e liberação/retirada manual. Cada evento fica registrado e
// um mesmo aviso nunca é aplicado duas vezes (event_key único).
import { createHash } from "crypto";

// launched = false: modo teste. O Hub fica escondido das creators (sem menu, sem aviso, sem checkout),
// exceto as creators de teste (testers: e-mails). Ao lançar, aparece para todas.
export type HubSettings = { price: number; grace_days: number; checkout_url: string; b4you_product: string; launched?: boolean; testers?: string[] };
export const HUB_DEFAULT: HubSettings = { price: 37, grace_days: 3, checkout_url: "", b4you_product: "", launched: false, testers: [] };
export const isTester = (cfg: HubSettings, email?: string | null) => !!email && (cfg.testers || []).map((x) => x.toLowerCase()).includes(String(email).toLowerCase());

export async function hubSettings(admin: any): Promise<HubSettings> {
  const { data } = await admin.from("settings").select("value").eq("key", "hub").maybeSingle();
  return { ...HUB_DEFAULT, ...(data?.value || {}) };
}

const DAY = 864e5;
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const fmt = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

// Classifica o aviso da B4YOU (leitura tolerante: procura as palavras no status/evento)
export function hubKind(statuses: string[]) {
  const st = statuses.join(" ").toLowerCase();
  if (/(refund|reembols|estorn|chargeback|contesta)/.test(st)) return "reembolso";
  if (/(cancel)/.test(st)) return "cancelamento";
  if (/(recus|refus|denied|negad|fail|falh|overdue|atras|inadimpl|expired_card|unpaid)/.test(st)) return "atraso";
  if (/(approv|aprovad|\bpaid\b|_paid|paid_|\bpago\b|complete|conclu|confirm|success|sucesso|renew|renova|active|ativ)/.test(st) && !/(waiting|aguard|pending|pendente)/.test(st)) return "pagamento";
  if (/(waiting|pending|aguard|pendente|generated|gerad|created|criad|billet|boleto|pix)/.test(st)) return "pendente";
  return "desconhecido";
}

// Chave do aviso: o mesmo aviso reenviado (ou reprocessado) gera a mesma chave e não é aplicado de novo.
export function eventKey(kind: string, payload: any) {
  return `${kind}:${createHash("sha256").update(JSON.stringify(payload || {})).digest("hex").slice(0, 40)}`;
}

// Creators com Conecta Hub liberado agora (mesma regra de creator_has_hub no banco)
export async function hubCreatorIds(admin: any): Promise<string[]> {
  const cfg = await hubSettings(admin);
  const { data, error } = await admin.from("subscriptions").select("creator_id,status,current_period_end,grace_until,manual").eq("plan_code", "hub").in("status", ["ativa", "em_atraso", "cancelada"]);
  if (error) return [];
  return (data || []).filter((s: any) => hasAccess(s, cfg.grace_days)).map((s: any) => s.creator_id);
}
export function hasAccess(s: any, graceDays = 3) {
  if (!s || !["ativa", "em_atraso", "cancelada"].includes(s.status)) return false;
  const lim = s.grace_until ? new Date(s.grace_until).getTime() : s.current_period_end ? new Date(s.current_period_end).getTime() + (s.status === "cancelada" || s.manual ? 0 : graceDays) * DAY : Infinity;
  return Date.now() <= lim;
}

async function notifyCreator(admin: any, creatorId: string, text: string, link = "/hub") {
  const { data: ps } = await admin.from("profiles").select("id").eq("creator_id", creatorId).eq("role", "creator");
  if (ps?.length) await admin.from("notifications").insert(ps.map((p: any) => ({ user_id: p.id, text, link })));
}
async function notifyAdmins(admin: any, text: string, link = "/assinaturas") {
  const { data: st } = await admin.from("profiles").select("id,role,perms").eq("status", "ativo").in("role", ["ceo", "equipe", "financeiro"]);
  const ids = (st || []).filter((p: any) => p.role === "ceo" || p.role === "financeiro" || (p.perms || []).includes("assinaturas")).map((p: any) => p.id);
  if (ids.length) await admin.from("notifications").insert(ids.map((id: string) => ({ user_id: id, text, link })));
}

async function getSub(admin: any, creatorId: string) {
  const { data } = await admin.from("subscriptions").select("*").eq("creator_id", creatorId).eq("plan_code", "hub").maybeSingle();
  return data;
}
async function upsertSub(admin: any, creatorId: string, patch: any) {
  const cur = await getSub(admin, creatorId);
  const row = { ...patch, updated_at: new Date().toISOString() };
  if (cur) { const { data } = await admin.from("subscriptions").update(row).eq("id", cur.id).select("*").single(); return data; }
  const { data } = await admin.from("subscriptions").insert({ creator_id: creatorId, plan_code: "hub", ...row }).select("*").single();
  return data;
}
async function logEvent(admin: any, e: { subscription_id?: string; creator_id: string; kind: string; event_key?: string | null; amount?: number | null; b4_event_id?: string | null; note?: string; by_profile?: string | null }) {
  const { error } = await admin.from("subscription_events").insert(e);
  return !error;
}

export type HubInput = { creatorId: string; kind: string; key?: string | null; amount?: number | null; email?: string | null; order?: string | null; b4EventId?: string | null };

// Aplica um aviso de pagamento à assinatura da creator. Retorna um texto curto do que aconteceu.
export async function applyHubEvent(admin: any, x: HubInput): Promise<{ status: "Processado" | "Ignorado" | "Duplicado"; note: string }> {
  // Reserva a chave do aviso antes de mudar qualquer coisa: dois avisos iguais chegando juntos não são aplicados duas vezes
  let claimId: string | null = null;
  if (x.key) {
    const { data: cl, error } = await admin.from("subscription_events").insert({ creator_id: x.creatorId, kind: x.kind, event_key: x.key, amount: x.amount ?? null, b4_event_id: x.b4EventId ?? null, note: "Recebido" }).select("id").single();
    if (error || !cl) return { status: "Duplicado", note: "Aviso repetido: já tinha sido aplicado, nada mudou." };
    claimId = cl.id;
  }
  const log = async (e: any) => (claimId ? admin.from("subscription_events").update({ ...e, event_key: x.key }).eq("id", claimId) : logEvent(admin, e));
  const cfg = await hubSettings(admin);
  const cur = await getSub(admin, x.creatorId);
  const now = new Date();
  const { data: cr } = await admin.from("creators").select("name").eq("id", x.creatorId).single();
  const who = cr?.name || x.email || "Creator";
  let note = "";

  if (x.kind === "pagamento") {
    // Proteção extra: um pagamento recebido logo depois de outro não estende de novo
    if (cur?.last_payment_at && now.getTime() - new Date(cur.last_payment_at).getTime() < 20 * DAY && cur.status === "ativa" && x.order && cur.provider_ref === x.order) {
      await log({ subscription_id: cur.id, creator_id: x.creatorId, kind: "duplicado", note: "Pagamento repetido do mesmo pedido: ignorado" });
      return { status: "Duplicado", note: "Pagamento já aplicado neste período." };
    }
    const renewal = !!cur && ["ativa", "em_atraso", "cancelada"].includes(cur.status) && !!cur.last_payment_at;
    const base = cur?.current_period_end && new Date(cur.current_period_end) > now ? new Date(cur.current_period_end) : now;
    const end = addMonths(base, 1);
    const sub = await upsertSub(admin, x.creatorId, { status: "ativa", started_at: cur?.started_at && cur.status !== "expirada" && cur.status !== "reembolsada" ? cur.started_at : now.toISOString(), current_period_end: end.toISOString(), grace_until: null, canceled_at: null, last_payment_at: now.toISOString(), last_amount: x.amount ?? cfg.price, provider_ref: x.order || cur?.provider_ref || null, email: x.email || cur?.email || null, manual: false });
    // assinante do Hub entra na base completa da Conecta
    await admin.from("creators").update({ brand_only: false }).eq("id", x.creatorId).eq("brand_only", true);
    await log({ subscription_id: sub?.id, creator_id: x.creatorId, kind: renewal ? "renovacao" : "pagamento", event_key: x.key, amount: x.amount, b4_event_id: x.b4EventId, note: `Acesso até ${fmt(end)}` });
    await notifyCreator(admin, x.creatorId, renewal ? `💖 Assinatura do Conecta Hub renovada. Acesso garantido até ${fmt(end)}.` : "🎉 Bem-vinda ao CONECTA HUB! Seu acesso exclusivo foi liberado.");
    await notifyAdmins(admin, `${renewal ? "🔁 Renovação" : "💎 Nova assinatura"} do Conecta Hub: ${who}`);
    note = `${renewal ? "Renovação" : "Assinatura ativada"}: acesso até ${fmt(end)}.`;
    return { status: "Processado", note };
  }

  if (!cur) {
    if (x.kind === "pendente") {
      const sub = await upsertSub(admin, x.creatorId, { status: "pendente", email: x.email || null, provider_ref: x.order || null });
      await log({ subscription_id: sub?.id, creator_id: x.creatorId, kind: "pendente", event_key: x.key, b4_event_id: x.b4EventId, note: "Aguardando pagamento" });
      return { status: "Processado", note: "Assinatura registrada como pendente (aguardando pagamento)." };
    }
    return { status: "Ignorado", note: "Aviso sem assinatura correspondente." };
  }

  if (x.kind === "pendente") {
    await log({ subscription_id: cur.id, creator_id: x.creatorId, kind: "pendente", event_key: x.key, b4_event_id: x.b4EventId, note: "Cobrança gerada, aguardando pagamento" });
    return { status: "Ignorado", note: "Cobrança aguardando pagamento: nada muda no acesso." };
  }

  if (x.kind === "atraso") {
    const from = cur.current_period_end && new Date(cur.current_period_end) > now ? new Date(cur.current_period_end) : now;
    const grace = new Date(from.getTime() + cfg.grace_days * DAY);
    await upsertSub(admin, x.creatorId, { status: "em_atraso", grace_until: grace.toISOString() });
    await log({ subscription_id: cur.id, creator_id: x.creatorId, kind: "atraso", event_key: x.key, b4_event_id: x.b4EventId, note: `Carência até ${fmt(grace)}` });
    await notifyCreator(admin, x.creatorId, `⚠️ Não conseguimos confirmar o pagamento do seu Conecta Hub. Atualize o pagamento até ${fmt(grace)} para não perder o acesso.`);
    await notifyAdmins(admin, `⚠️ Pagamento em atraso no Conecta Hub: ${who}`);
    return { status: "Processado", note: `Pagamento em atraso: acesso mantido até ${fmt(grace)} (carência de ${cfg.grace_days} dias).` };
  }

  if (x.kind === "cancelamento") {
    await upsertSub(admin, x.creatorId, { status: "cancelada", canceled_at: now.toISOString(), grace_until: null });
    await log({ subscription_id: cur.id, creator_id: x.creatorId, kind: "cancelamento", event_key: x.key, b4_event_id: x.b4EventId, note: `Acesso até ${fmt(cur.current_period_end)}` });
    await notifyCreator(admin, x.creatorId, `Sua assinatura do Conecta Hub foi cancelada. Você continua com acesso até ${fmt(cur.current_period_end)}.`);
    await notifyAdmins(admin, `❌ Cancelamento do Conecta Hub: ${who} (acesso até ${fmt(cur.current_period_end)})`);
    return { status: "Processado", note: `Cancelada: acesso mantido até o fim do período pago (${fmt(cur.current_period_end)}).` };
  }

  if (x.kind === "reembolso") {
    await upsertSub(admin, x.creatorId, { status: "reembolsada", current_period_end: now.toISOString(), grace_until: now.toISOString() });
    await log({ subscription_id: cur.id, creator_id: x.creatorId, kind: "reembolso", event_key: x.key, amount: x.amount, b4_event_id: x.b4EventId, note: "Acesso retirado" });
    await notifyCreator(admin, x.creatorId, "Seu pagamento do Conecta Hub foi estornado e o acesso exclusivo foi encerrado.");
    await notifyAdmins(admin, `↩️ Reembolso/estorno do Conecta Hub: ${who} (acesso retirado)`);
    return { status: "Processado", note: "Reembolso/estorno: acesso retirado na hora." };
  }
  return { status: "Ignorado", note: "Tipo de aviso não reconhecido para assinatura." };
}

// Liberação/retirada manual pela administração (sempre com motivo e registro)
export async function manualHub(admin: any, creatorId: string, op: "liberar" | "retirar", byProfile: string, reason: string, until?: string | null) {
  const now = new Date();
  const cur = await getSub(admin, creatorId);
  if (op === "liberar") {
    const end = until ? new Date(`${until}T23:59:59-03:00`) : addMonths(now, 1);
    const sub = await upsertSub(admin, creatorId, { status: "ativa", manual: true, manual_by: byProfile, note: reason, started_at: cur?.started_at && cur.status === "ativa" ? cur.started_at : now.toISOString(), current_period_end: end.toISOString(), grace_until: null, canceled_at: null, provider: cur?.provider || "Manual" });
    await admin.from("creators").update({ brand_only: false }).eq("id", creatorId).eq("brand_only", true);
    await logEvent(admin, { subscription_id: sub?.id, creator_id: creatorId, kind: "manual_liberar", note: `${reason} · até ${fmt(end)}`, by_profile: byProfile });
    await notifyCreator(admin, creatorId, `💎 A equipe Conecta liberou seu acesso ao CONECTA HUB até ${fmt(end)}.`);
    return end;
  }
  if (!cur) return null;
  await upsertSub(admin, creatorId, { status: "expirada", current_period_end: now.toISOString(), grace_until: now.toISOString(), note: reason, manual_by: byProfile });
  await logEvent(admin, { subscription_id: cur.id, creator_id: creatorId, kind: "manual_retirar", note: reason, by_profile: byProfile });
  return now;
}

// Rotina diária: atraso automático, fim da carência, fim do período cancelado e lembretes
export async function hubDaily(admin: any) {
  const cfg = await hubSettings(admin);
  const now = Date.now();
  let changed = 0;
  const { data: subs } = await admin.from("subscriptions").select("*").eq("plan_code", "hub").in("status", ["ativa", "em_atraso", "cancelada"]);
  for (const s of subs || []) {
    const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
    if (end == null) continue; // liberação sem data de fim
    const day = new Date(now - 3 * 3600e3).toISOString().slice(0, 10);
    if (s.status === "ativa" && s.manual && end < now) {
      // liberação manual: termina na data combinada, sem carência
      await admin.from("subscriptions").update({ status: "expirada", updated_at: new Date().toISOString() }).eq("id", s.id);
      await logEvent(admin, { subscription_id: s.id, creator_id: s.creator_id, kind: "expiracao", event_key: `auto-exp:${s.id}:${day}`, note: "Fim do acesso liberado manualmente" });
      await notifyCreator(admin, s.creator_id, "O acesso liberado ao Conecta Hub terminou. Assine para continuar com as áreas exclusivas. 💎", "/hub");
      changed++;
    } else if (s.status === "ativa" && end < now) {
      const grace = new Date(end + cfg.grace_days * DAY);
      await admin.from("subscriptions").update({ status: "em_atraso", grace_until: grace.toISOString(), updated_at: new Date().toISOString() }).eq("id", s.id);
      await logEvent(admin, { subscription_id: s.id, creator_id: s.creator_id, kind: "atraso", event_key: `auto-atraso:${s.id}:${day}`, note: `Renovação não confirmada · carência até ${fmt(grace)}` });
      if (!s.manual) await notifyCreator(admin, s.creator_id, `⚠️ A renovação do seu Conecta Hub ainda não foi confirmada. Seu acesso fica liberado até ${fmt(grace)}.`);
      changed++;
    } else if (s.status === "em_atraso" && (s.grace_until ? new Date(s.grace_until).getTime() : end + cfg.grace_days * DAY) < now) {
      await admin.from("subscriptions").update({ status: "expirada", updated_at: new Date().toISOString() }).eq("id", s.id);
      await logEvent(admin, { subscription_id: s.id, creator_id: s.creator_id, kind: "expiracao", event_key: `auto-exp:${s.id}:${day}`, note: "Carência encerrada sem pagamento" });
      await notifyCreator(admin, s.creator_id, "Seu acesso ao Conecta Hub foi pausado por falta de pagamento. Assine de novo para voltar.", "/hub");
      await notifyAdmins(admin, `⏸️ Conecta Hub expirado por falta de pagamento (creator ${s.email || s.creator_id})`);
      changed++;
    } else if (s.status === "cancelada" && end < now) {
      await admin.from("subscriptions").update({ status: "expirada", updated_at: new Date().toISOString() }).eq("id", s.id);
      await logEvent(admin, { subscription_id: s.id, creator_id: s.creator_id, kind: "expiracao", event_key: `auto-exp:${s.id}:${day}`, note: "Fim do período após cancelamento" });
      await notifyCreator(admin, s.creator_id, "Seu período do Conecta Hub terminou. Quando quiser voltar, é só assinar de novo. 💖", "/hub");
      changed++;
    } else if (s.status === "ativa" && s.manual && end - now < 3 * DAY && end > now) {
      // liberação manual perto do fim: lembrete único
      const ok = await logEvent(admin, { subscription_id: s.id, creator_id: s.creator_id, kind: "lembrete", event_key: `lembrete:${s.id}:${s.current_period_end}`, note: "Aviso de fim do acesso liberado" });
      if (ok) await notifyCreator(admin, s.creator_id, `Seu acesso ao Conecta Hub termina em ${fmt(s.current_period_end)}. Assine para continuar. 💎`, "/hub");
    }
  }
  return changed;
}

// Aviso da B4YOU que é do produto Conecta Hub (chamado por processB4Event)
export async function processHubEvent(admin: any, ev: any, info: any, finish: (status: string, note: string, extra?: any) => Promise<string>) {
  const kind = hubKind(info.statuses);
  const month = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);
  // venda no financeiro (uma por cobrança/mês)
  if (kind === "pagamento" && info.value) {
    const external_id = `b4-hub-${info.order || ev.id}-${month}`;
    const { data: ex } = await admin.from("sales").select("id").eq("external_id", external_id).limit(1);
    if (!ex?.length) await admin.from("sales").insert({ kind: "Conecta Hub", product: "Conecta Hub (assinatura mensal)", sold: info.value, status: "Aprovada", source: "B4YOU", external_id, buyer_email: info.email, order_code: info.order, b4_event_id: ev.id, sale_date: new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), rule: "Produto", creator_pct: 0, conecta_pct: 100 });
  }
  if (kind === "reembolso" && info.order) {
    const { data: last } = await admin.from("sales").select("id").eq("kind", "Conecta Hub").eq("order_code", info.order).eq("status", "Aprovada").order("created_at", { ascending: false }).limit(1);
    if (last?.[0]) await admin.from("sales").update({ status: "Cancelada" }).eq("id", last[0].id);
  }
  // quem é a creator: escolhida pela equipe > e-mail da creator > e-mail do acesso > checkout iniciado com o e-mail
  let creatorId: string | null = ev.creator_id || null;
  if (!creatorId && info.email) {
    const { data: c } = await admin.from("creators").select("id").ilike("email", info.email).limit(1);
    creatorId = c?.[0]?.id || null;
    if (!creatorId) { const { data: p } = await admin.from("profiles").select("creator_id").ilike("email", info.email).eq("role", "creator").not("creator_id", "is", null).limit(1); creatorId = p?.[0]?.creator_id || null; }
    if (!creatorId) { const { data: s } = await admin.from("subscriptions").select("creator_id").ilike("email", info.email).limit(1); creatorId = s?.[0]?.creator_id || null; }
  }
  const extra = { product: "Conecta Hub" };
  if (!creatorId) {
    if (kind !== "pagamento") return finish("Ignorado", `Conecta Hub: aviso “${kind}” sem creator cadastrada${info.email ? ` com o e-mail ${info.email}` : ""}.`, extra);
    if (info.value) await admin.from("sales").update({ creator_id: null }).eq("b4_event_id", ev.id);
    return finish("Para revisar", `Conecta Hub: pagamento recebido${info.email ? ` de ${info.email}` : ""}, mas nenhuma creator tem esse e-mail. A venda já está no financeiro; escolha a creator em Conecta Hub › Avisos para liberar o acesso.`, extra);
  }
  if (kind === "pagamento") await admin.from("sales").update({ creator_id: creatorId }).eq("b4_event_id", ev.id);
  const r = await applyHubEvent(admin, { creatorId, kind, key: eventKey(kind, ev.payload), amount: info.value, email: info.email, order: info.order, b4EventId: ev.id });
  return finish(r.status === "Duplicado" ? "Processado" : r.status, `Conecta Hub: ${r.note}`, { ...extra, creator_id: creatorId });
}
