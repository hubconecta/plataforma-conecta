"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModule, getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { g, orNull, num, money, back, notifyProfiles, hiddenForBrand } from "@/lib/act";

const PLACE = (n: number) => `${n}º lugar`;

// Premiação: várias colocações, cada uma com requisito, tipo, prêmio e valor.
function readPrizes(fd: FormData) {
  let raw: any[] = [];
  try { raw = JSON.parse(g(fd, "prizes") || "[]"); } catch {}
  return (Array.isArray(raw) ? raw : []).slice(0, 20).map((p: any) => ({
    place: String(p?.place || "").trim().slice(0, 60) || "Prêmio",
    requirement: String(p?.requirement || "").trim().slice(0, 300),
    reward_type: String(p?.reward_type || "Produto").slice(0, 40),
    reward_label: String(p?.reward_label || "").trim().slice(0, 200),
    reward_value: money(String(p?.reward_value ?? "")) || null,
  })).filter((p) => p.reward_label || p.requirement || p.reward_value);
}

function readChallenge(fd: FormData) {
  const prizes = fd.has("prizes") ? readPrizes(fd) : null;
  const first = prizes?.[0];
  const placed = (prizes || []).filter((p) => /º lugar$/.test(p.place)).length;
  return {
    ...(prizes ? { prizes, winners: placed, reward_type: first?.reward_type || "Produto", reward_label: first?.reward_label || null, reward_value: first?.reward_value || null } : {}),
    name: g(fd, "name"), description: orNull(g(fd, "description")), objective: orNull(g(fd, "objective")), rules: orNull(g(fd, "rules")),
    criteria: orNull(g(fd, "criteria")), evidence: orNull(g(fd, "evidence")), regulation: orNull(g(fd, "regulation")),
    type: g(fd, "type") || "Conteúdo", audience: g(fd, "audience") || "Todas as creators",
    campaign_id: orNull(g(fd, "campaign_id")), start_date: orNull(g(fd, "start_date")), due_date: orNull(g(fd, "due_date")),
    target: Math.max(1, Number(g(fd, "target")) || 1), points: Number(g(fd, "points")) || 0,
    ...(fd.has("prizes") ? {} : { winners: Number(g(fd, "winners")) || 0, reward_type: g(fd, "reward_type") || "Produto", reward_label: orNull(g(fd, "reward_label")), reward_value: num(fd, "reward_value") }),
  };
}

// Avisa as creators do público do desafio quando ele fica Ativo.
async function announce(supabase: any, ch: any) {
  let ids: string[] = [];
  if (ch.campaign_id) {
    const { data } = await supabase.from("campaign_applications").select("creator_id").eq("campaign_id", ch.campaign_id).eq("status", "Aprovada");
    ids = (data || []).map((a: any) => a.creator_id);
  }
  let q = supabase.from("profiles").select("id,creator_id").eq("role", "creator").eq("status", "ativo");
  if (ch.campaign_id && ch.audience.startsWith("Participantes")) { if (!ids.length) return; q = q.in("creator_id", ids); }
  if (ch.audience === "Creators da base da marca") {
    if (!ch.brand_id) return;
    let base: any[] = [];
    try { base = (await createAdminClient().from("creator_brands").select("creator_id").eq("brand_id", ch.brand_id)).data || []; } catch {}
    if (!base.length) return;
    q = q.in("creator_id", base.map((b: any) => b.creator_id));
  }
  const { data: ps } = await q;
  const hide = await hiddenForBrand(supabase, ch.brand_id);
  await notifyProfiles(supabase, { ids: (ps || []).filter((p: any) => !hide.has(p.creator_id)).map((p: any) => p.id) }, `🔥 Novo desafio disponível: ${ch.name}`, "/clube/desafios");
}

export async function saveChallenge(fd: FormData) {
  const { supabase, profile } = await requireModule("desafios");
  const isBrand = profile.role === "marca";
  const id = g(fd, "id");
  const row: any = readChallenge(fd);
  const path = id ? `/desafios/${id}` : "/desafios";
  if (!row.name) back(path, "Dê um nome ao desafio.", false);
  if (row.start_date && row.due_date && row.due_date < row.start_date) back(path, "A data final precisa ser depois da data inicial.", false);
  if (isBrand) {
    row.brand_id = profile.brand_id; row.status = "Em aprovação"; row.proposed_by = profile.id;
    if (row.campaign_id) { const { data: c } = await supabase.from("campaigns").select("brand_id").eq("id", row.campaign_id).single(); if (c?.brand_id !== profile.brand_id) row.campaign_id = null; }
  } else {
    row.brand_id = orNull(g(fd, "brand_id"));
    if (row.campaign_id && !row.brand_id) { const { data: c } = await supabase.from("campaigns").select("brand_id").eq("id", row.campaign_id).single(); row.brand_id = c?.brand_id || null; }
    if (!id) row.status = g(fd, "status") || "Rascunho";
  }
  if (row.audience === "Creators da base da marca" && !row.brand_id) back(path, "Para o público “Creators da base da marca”, escolha a marca do desafio.", false);
  let cid = id;
  if (id) {
    const { error } = await supabase.from("challenges").update(row).eq("id", id);
    if (error) back(path, "Não foi possível salvar: " + error.message, false);
  } else {
    const { data, error } = await supabase.from("challenges").insert(row).select("id").single();
    if (error) back(path, "Não foi possível salvar: " + error.message, false);
    cid = data.id;
  }
  await logAction(supabase, profile, `${isBrand ? "enviou para aprovação" : id ? "editou" : "criou"} o desafio ${row.name}${row.status ? ` (${row.status})` : ""}`, "Desafios", cid);
  if (!isBrand && !id && row.status === "Ativo") await announce(supabase, { ...row, id: cid });
  revalidatePath("/desafios");
  back(`/desafios/${cid}`, isBrand ? "Desafio enviado para aprovação da Conecta. Você será avisada quando for aprovado." : id ? "Desafio atualizado." : "Desafio criado.");
}

const ASK: Record<string, string> = { Ativo: "ativou", Agendado: "agendou", Pausado: "pausou", Encerrado: "encerrou", Rascunho: "aprovou como rascunho", "Ajuste solicitado": "pediu ajuste no", Recusado: "recusou" };

export async function setChallengeStatus(fd: FormData) {
  const { supabase, profile } = await requireModule("desafios");
  if (profile.role === "marca") back("/desafios", "Sem permissão.", false);
  const id = g(fd, "id"), status = g(fd, "status"), note = orNull(g(fd, "note"));
  const { data: ch } = await supabase.from("challenges").select("*").eq("id", id).single();
  if (!ch) back("/desafios", "Desafio não encontrado.", false);
  const upd: any = { status };
  if (["Ajuste solicitado", "Recusado"].includes(status)) upd.review_note = note;
  const { error } = await supabase.from("challenges").update(upd).eq("id", id);
  if (error) back(`/desafios/${id}`, error.message, false);
  const wasProposal = ["Em aprovação", "Ajuste solicitado"].includes(ch.status);
  if (wasProposal && ch.brand_id) {
    const msg = status === "Ajuste solicitado" ? `✏️ A Conecta pediu ajustes no desafio ${ch.name}${note ? ": " + note : ""}` : status === "Recusado" ? `O desafio ${ch.name} não foi aprovado${note ? ": " + note : ""}` : `✅ Desafio aprovado pela Conecta: ${ch.name}`;
    await notifyProfiles(supabase, { brand_id: ch.brand_id }, msg, `/desafios/${id}`);
  }
  if (status === "Ativo") await announce(supabase, ch);
  await logAction(supabase, profile, `${ASK[status] || "alterou"} o desafio ${ch.name}`, "Desafios", id);
  revalidatePath("/desafios");
  back(`/desafios/${id}`, `Desafio: ${status}.`);
}

export async function reviewSubmission(fd: FormData) {
  const { supabase, profile } = await requireModule("desafios");
  if (profile.role === "marca") back("/desafios", "Sem permissão.", false);
  const id = g(fd, "id"), status = g(fd, "status");
  const { data: s } = await supabase.from("challenge_submissions").select("*, challenges(*), creators(name)").eq("id", id).single();
  if (!s) back("/desafios", "Comprovante não encontrado.", false);
  const ch = (s as any).challenges, crName = (s as any).creators?.name;
  const note = status === "Ajuste necessário" ? (g(fd, "note") || "A equipe pediu um ajuste no comprovante. Confira as regras e envie de novo.") : status === "Reprovado" ? (g(fd, "note") || "Comprovante reprovado. Confira as regras do desafio.") : null;
  await supabase.from("challenge_submissions").update({ status, note, reviewed_by: profile.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (status === "Aprovado") {
    await supabase.from("challenge_participants").upsert({ challenge_id: ch.id, creator_id: s.creator_id, progress: ch.target });
    const admin = createAdminClient();
    if (ch.points) {
      await admin.from("points_log").insert({ creator_id: s.creator_id, points: ch.points, reason: `Desafio aprovado: ${ch.name}` });
      const { data: c } = await admin.from("creators").select("xp").eq("id", s.creator_id).single();
      await admin.from("creators").update({ xp: (c?.xp || 0) + ch.points }).eq("id", s.creator_id);
    }
    const { data: has } = await supabase.from("rewards").select("id").eq("challenge_id", ch.id).eq("creator_id", s.creator_id).limit(1);
    if (!has?.length && (ch.reward_label || ch.reward_type)) await supabase.from("rewards").insert({ creator_id: s.creator_id, title: ch.reward_label || ch.reward_type, type: ch.reward_type, campaign_id: ch.campaign_id, challenge_id: ch.id, value: ch.reward_value, status: "Aprovada" });
    await notifyProfiles(supabase, { creator_id: s.creator_id }, `🏆 Desafio aprovado! ${ch.points ? `+${ch.points} pontos ` : ""}em "${ch.name}"`, "/clube/desafios");
  } else {
    await notifyProfiles(supabase, { creator_id: s.creator_id }, status === "Ajuste necessário" ? `✏️ Ajuste necessário em "${ch.name}"` : `Seu comprovante em "${ch.name}" não foi aprovado`, "/clube/desafios");
  }
  await logAction(supabase, profile, `marcou o comprovante de ${crName} em ${ch.name} como ${status}`, "Desafios", ch.id);
  back(`/desafios/${ch.id}?tab=comprovantes`, `Comprovante de ${crName}: ${status}.`);
}

export async function saveChallengeResult(fd: FormData) {
  const { supabase, profile } = await requireModule("desafios");
  if (profile.role === "marca") back("/desafios", "Sem permissão.", false);
  const id = g(fd, "id");
  const path = `/desafios/${id}?tab=resultado`;
  const { data: ch } = await supabase.from("challenges").select("*").eq("id", id).single();
  if (!ch) back("/desafios", "Desafio não encontrado.", false);
  const rows = Number(g(fd, "rows")) || 0;
  const winners: any[] = [];
  for (let i = 0; i < rows; i++) {
    const cr = g(fd, `w${i}_creator`);
    if (!cr) continue;
    winners.push({ creator_id: cr, place: winners.length + 1, prize: g(fd, `w${i}_prize`), highlight: g(fd, `w${i}_highlight`) });
  }
  if (!winners.length) back(path, "Escolha pelo menos uma ganhadora.", false);
  if (new Set(winners.map((w) => w.creator_id)).size !== winners.length) back(path, "A mesma creator aparece em duas colocações.", false);
  const { data: crs } = await supabase.from("creators").select("id,name").in("id", winners.map((w) => w.creator_id));
  const nm = new Map((crs || []).map((c: any) => [c.id, c.name]));
  winners.forEach((w) => (w.name = nm.get(w.creator_id) || ""));
  const metrics: Record<string, number> = {};
  ["participants", "contents", "views", "interactions", "clicks", "orders", "sales"].forEach((k) => (metrics[k] = money(g(fd, `m_${k}`)) || 0));
  const first = !ch.result;
  const result = { at: new Date().toISOString(), by: profile.name, winners, metrics, notes: g(fd, "notes"), links: g(fd, "links") };
  const upd: any = { result, winners: Math.max(ch.winners || 0, winners.length) };
  if (fd.get("close")) upd.status = "Encerrado";
  const { error } = await supabase.from("challenges").update(upd).eq("id", id);
  if (error) back(path, error.message, false);

  if (fd.get("rewards")) {
    const { data: ex } = await supabase.from("rewards").select("creator_id,title").eq("challenge_id", id);
    const done = new Set((ex || []).filter((r: any) => String(r.title).startsWith("🏆")).map((r: any) => r.creator_id));
    const toAdd = winners.filter((w) => !done.has(w.creator_id)).map((w) => {
      const pz = Array.isArray(ch.prizes) ? ch.prizes.find((p: any) => p.place === PLACE(w.place)) : null;
      const v = Number(pz?.reward_value) || Number(String(w.prize).replace(/[^\d,]/g, "").replace(",", ".")) || null;
      return { creator_id: w.creator_id, title: `🏆 ${PLACE(w.place)} · ${ch.name}${w.prize ? " · " + w.prize : ""}`, type: pz?.reward_type || (v ? "Dinheiro" : ch.reward_type), campaign_id: ch.campaign_id, challenge_id: id, value: v, status: "Aprovada" };
    });
    if (toAdd.length) await supabase.from("rewards").insert(toAdd);
  }
  for (const w of winners) await supabase.rpc("award_winner", { cr: w.creator_id, ch: id, place: w.place });
  if (first) for (const w of winners) await notifyProfiles(supabase, { creator_id: w.creator_id }, `🏆 Parabéns! Você ficou em ${PLACE(w.place)} no desafio "${ch.name}"${w.prize ? ` · ${w.prize}` : ""}`, "/clube/desafios");
  const wl = winners.map((w) => `${w.place}º ${w.name}`).join(", ");
  if (ch.brand_id) {
    await supabase.from("report_entries").insert({ brand_id: ch.brand_id, kind: "Desafio", ref_id: id, title: `Resultado · ${ch.name}`, summary: `${metrics.participants} creators participaram, ${metrics.views.toLocaleString("pt-BR")} visualizações, R$ ${metrics.sales.toLocaleString("pt-BR")} em vendas. Ganhadoras: ${wl}.`, by_name: profile.name });
    if (fd.get("notify_brand")) await notifyProfiles(supabase, { brand_id: ch.brand_id }, `Resultado do desafio ${ch.name}: ganhadoras ${wl}. O relatório da sua marca foi atualizado.`, `/desafios/${id}?tab=resultado`);
  }
  await logAction(supabase, profile, `registrou o resultado do desafio ${ch.name}`, "Desafios", id);
  revalidatePath("/desafios"); revalidatePath("/relatorios");
  back(path, "Resultado salvo. Ganhadoras e números já aparecem para a marca e no relatório.");
}

export async function deleteChallenge(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back("/desafios", "Só a CEO pode excluir desafios.", false);
  const id = g(fd, "id");
  const { data: ch } = await s.supabase.from("challenges").select("name").eq("id", id).single();
  const { error } = await s.supabase.from("challenges").delete().eq("id", id);
  if (error) back(`/desafios/${id}`, error.message, false);
  await logAction(s.supabase, s.profile!, `excluiu o desafio ${ch?.name || ""}`, "Desafios", null);
  back("/desafios", "Desafio excluído.");
}

/* ----- Creator ----- */
export async function joinChallenge(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id");
  const { error } = await s.supabase.from("challenge_participants").insert({ challenge_id: id, creator_id: s.profile.creator_id, progress: 0 });
  if (error && !error.message.includes("duplicate")) back("/clube/desafios", "Não foi possível participar: este desafio não está aberto para você.", false);
  await logAction(s.supabase, s.profile, "entrou em um desafio", "Desafios", id);
  back("/clube/desafios?tab=ativos", "Você está participando! Quando cumprir o desafio, envie o comprovante.");
}

export async function submitEvidence(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id"), evidence = g(fd, "evidence");
  const links = [...new Set(fd.getAll("links").map((x) => String(x).trim()).filter(Boolean))];
  const link = links[0] || orNull(g(fd, "link"));
  if (!evidence && !link) back("/clube/desafios?tab=ativos", "Conte o que você fez ou cole o link do comprovante.", false);
  const { data: prev } = await s.supabase.from("challenge_submissions").select("id,status").eq("challenge_id", id).eq("creator_id", s.profile.creator_id).maybeSingle();
  if (prev && !["Ajuste necessário", "Reprovado"].includes(prev.status)) back("/clube/desafios?tab=ativos", "Seu comprovante já foi enviado e está com a equipe Conecta.", false);
  const { error } = prev
    ? await s.supabase.from("challenge_submissions").update({ status: "Enviado", evidence, link, links, note: null, updated_at: new Date().toISOString() }).eq("id", prev.id)
    : await s.supabase.from("challenge_submissions").insert({ challenge_id: id, creator_id: s.profile.creator_id, evidence, link, links });
  if (error) back("/clube/desafios?tab=ativos", "Não foi possível enviar agora. O desafio pode ter sido encerrado.", false);
  await logAction(s.supabase, s.profile, "enviou comprovante de desafio", "Desafios", id);
  back("/clube/desafios?tab=ativos", "Comprovante enviado! A equipe Conecta vai analisar e você será avisada.");
}


/* ---------- Desafio diário: lançamentos da creator ---------- */
const ENTRY_KINDS = ["Vídeo", "Reels", "Stories", "TikTok", "Carrossel", "Live", "Venda", "Outro"];

export async function addChallengeEntry(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id"), path = "/clube/desafios?tab=ativos";
  const kind = ENTRY_KINDS.includes(g(fd, "kind")) ? g(fd, "kind") : "Vídeo";
  const qty = Math.max(0, Math.min(1000, parseInt(g(fd, "qty")) || (kind === "Venda" ? 1 : 1)));
  const sales = kind === "Venda" ? money(g(fd, "sales")) || 0 : 0;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(g(fd, "day")) ? g(fd, "day") : new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const link = g(fd, "link").slice(0, 500);
  if (link && !/^https?:\/\//.test(link)) back(path, "Cole o link completo (começando com https://).", false);
  const { error } = await s.supabase.from("challenge_entries").insert({ challenge_id: id, creator_id: s.profile.creator_id, kind, qty, sales, day, link: link || null, note: g(fd, "note").slice(0, 300) || null });
  if (error) back(path, "Não foi possível lançar: o desafio precisa estar ativo e você precisa estar participando.", false);
  revalidatePath("/clube/desafios"); revalidatePath(`/desafios/${id}`);
  back(path, kind === "Venda" ? "Venda lançada! 💰" : `${qty} ${kind.toLowerCase()}${qty > 1 ? "s" : ""} lançado${qty > 1 ? "s" : ""}! Continue assim 🔥`);
}

export async function deleteChallengeEntry(fd: FormData) {
  const s = await getSession();
  if (!s.profile) redirect("/login");
  const path = g(fd, "back") || "/clube/desafios?tab=ativos";
  await s.supabase.from("challenge_entries").delete().eq("id", g(fd, "id"));
  revalidatePath("/clube/desafios");
  back(path, "Lançamento apagado.");
}
