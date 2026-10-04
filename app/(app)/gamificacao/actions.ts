"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, orNull, back } from "@/lib/act";

export async function saveLevels(fd: FormData) {
  const { supabase, profile } = await requireModule("gamificacao");
  const ids = fd.getAll("id").map(String);
  const rows = ids.map((id, i) => ({ id, position: i + 1, name: String(fd.getAll("name")[i] || "").trim(), min_points: Number(fd.getAll("min_points")[i]) || 0, color: String(fd.getAll("color")[i] || "#E6007E"), perks: orNull(String(fd.getAll("perks")[i] || "").trim()) }));
  if (rows.some((r) => !r.name)) back("/gamificacao", "Dê nome a todos os níveis.", false);
  const sorted = [...rows].sort((a, b) => a.min_points - b.min_points);
  if (sorted[0].min_points !== 0) back("/gamificacao", "O primeiro nível precisa começar em 0 pontos.", false);
  for (const r of rows) await supabase.from("levels").update(r).eq("id", r.id);
  await logAction(supabase, profile, "alterou os níveis das creators", "Níveis e pontos", null);
  revalidatePath("/gamificacao"); revalidatePath("/clube/jornada");
  back("/gamificacao", "Níveis salvos.");
}

export async function saveRules(fd: FormData) {
  const { supabase, profile } = await requireModule("gamificacao");
  const keys = fd.getAll("key").map(String);
  for (let i = 0; i < keys.length; i++) {
    await supabase.from("point_rules").update({ points: Number(fd.getAll("points")[i]) || 0, active: fd.getAll("active").map(String).includes(keys[i]), label: String(fd.getAll("label")[i] || "").trim() || undefined }).eq("key", keys[i]);
  }
  await logAction(supabase, profile, "alterou a tabela de pontos", "Níveis e pontos", null);
  revalidatePath("/gamificacao");
  back("/gamificacao?tab=pontos", "Pontuação salva. Vale para as próximas ações.");
}

export async function addRule(fd: FormData) {
  const { supabase, profile } = await requireModule("gamificacao");
  const label = g(fd, "label");
  const key = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  if (!label || !key) back("/gamificacao?tab=pontos", "Dê um nome para a ação.", false);
  const { error } = await supabase.from("point_rules").insert({ key, label, description: orNull(g(fd, "description")), points: Number(g(fd, "points")) || 0, auto: false, position: 100 });
  if (error) back("/gamificacao?tab=pontos", error.message.includes("duplicate") ? "Já existe uma ação com esse nome." : error.message, false);
  await logAction(supabase, profile, `criou a ação de pontos ${label}`, "Níveis e pontos", null);
  back("/gamificacao?tab=pontos", "Ação criada. Agora ela aparece em Dar pontos.");
}

export async function givePoints(fd: FormData) {
  const { supabase, profile } = await requireModule("gamificacao");
  const crs = fd.getAll("creator_id").map(String).filter(Boolean);
  const rk = g(fd, "rule_key"), custom = g(fd, "points"), reason = g(fd, "reason");
  if (!crs.length) back("/gamificacao?tab=dar", "Escolha pelo menos uma creator.", false);
  if (!rk && !custom) back("/gamificacao?tab=dar", "Escolha a ação ou digite os pontos.", false);
  let total = 0;
  for (const c of crs) {
    const { data, error } = await supabase.rpc("award_points", { cr: c, rk: rk || null, pts: custom ? Number(custom) : null, reason: reason || null });
    if (error) back("/gamificacao?tab=dar", "Não foi possível dar os pontos: " + error.message, false);
    total += Number(data) || 0;
  }
  await logAction(supabase, profile, `deu pontos para ${crs.length} creator(s)${reason ? `: ${reason}` : ""}`, "Níveis e pontos", null);
  revalidatePath("/gamificacao");
  back("/gamificacao?tab=dar", `Pontos lançados para ${crs.length} creator(s). Elas foram avisadas.`);
}
