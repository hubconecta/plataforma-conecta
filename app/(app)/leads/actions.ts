"use server";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { g, orNull, num, back, addDays, notifyProfiles } from "@/lib/act";
import { can } from "@/lib/perms";

function leadRow(fd: FormData) {
  return {
    company: g(fd, "company"), brand_name: orNull(g(fd, "brand_name")), cnpj: orNull(g(fd, "cnpj")), site: orNull(g(fd, "site")), instagram: orNull(g(fd, "instagram")), tiktok: orNull(g(fd, "tiktok")),
    segment: orNull(g(fd, "segment")), category: orNull(g(fd, "category")), city: orNull(g(fd, "city")), state: orNull(g(fd, "state")),
    contact: g(fd, "contact"), contact_role: orNull(g(fd, "contact_role")), email: orNull(g(fd, "email")), phone: orNull(g(fd, "phone")),
    objective: orNull(g(fd, "objective")), follow_up: orNull(g(fd, "follow_up")), owner_id: orNull(g(fd, "owner_id")),
    interests: fd.getAll("interests").map(String),
  };
}

export async function saveLead(fd: FormData) {
  const { supabase, profile } = await requireModule("crm");
  const id = g(fd, "id");
  const row: any = leadRow(fd);
  if (!row.company || !row.contact) back(id ? `/leads/${id}` : "/leads", "Informe a empresa e o responsável.", false);
  if (can(profile, "fin") || profile.role === "ceo") row.value = num(fd, "value");
  if (!id) { row.source = g(fd, "source") || "Cadastro manual"; row.stage = g(fd, "stage") || "Novo Lead"; row.follow_up = row.follow_up || addDays(2); }
  row.last_at = new Date().toISOString();
  const { data, error } = id ? await supabase.from("leads").update(row).eq("id", id).select("id").single() : await supabase.from("leads").insert(row).select("id").single();
  if (error) back(id ? `/leads/${id}` : "/leads", "Não foi possível salvar: " + error.message, false);
  if (row.owner_id && row.owner_id !== profile.id && !id) await notifyProfiles(supabase, { ids: [row.owner_id] }, `Lead atribuído a você: ${row.brand_name || row.company}`, `/leads/${data.id}`);
  await logAction(supabase, profile, `${id ? "editou" : "cadastrou"} o lead ${row.brand_name || row.company}`, "Leads", data.id);
  revalidatePath("/leads");
  back(`/leads/${data.id}`, id ? "Lead atualizado." : "Lead cadastrado.");
}

export async function setLeadStage(fd: FormData) {
  const { supabase, profile } = await requireModule("crm");
  const id = g(fd, "id"), stage = g(fd, "stage");
  const { data: l } = await supabase.from("leads").update({ stage, last_at: new Date().toISOString() }).eq("id", id).select("company,brand_name").single();
  await logAction(supabase, profile, `moveu o lead ${l?.brand_name || l?.company} para ${stage}`, "Leads", id);
  revalidatePath("/leads");
  back(g(fd, "back") || `/leads/${id}`, `Lead em: ${stage}.`);
}

export async function setLeadOwner(fd: FormData) {
  const { supabase, profile } = await requireModule("crm");
  const id = g(fd, "id"), owner = orNull(g(fd, "owner_id"));
  const { data: l } = await supabase.from("leads").update({ owner_id: owner, last_at: new Date().toISOString() }).eq("id", id).select("company,brand_name").single();
  if (owner && owner !== profile.id) await notifyProfiles(supabase, { ids: [owner] }, `Lead atribuído a você: ${l?.brand_name || l?.company}`, `/leads/${id}`);
  await logAction(supabase, profile, `atribuiu o lead ${l?.brand_name || l?.company}`, "Leads", id);
  back(`/leads/${id}`, "Responsável atualizado.");
}

export async function addLeadNote(fd: FormData) {
  const { supabase, profile } = await requireModule("crm");
  const id = g(fd, "id"), text = g(fd, "text");
  if (!text) back(`/leads/${id}`, "Escreva a interação.", false);
  await supabase.from("lead_notes").insert({ lead_id: id, who: profile.name, text });
  const { data: l } = await supabase.from("leads").select("stage,company,brand_name").eq("id", id).single();
  const upd: any = { last_at: new Date().toISOString(), follow_up: orNull(g(fd, "follow_up")) };
  if (l?.stage === "Novo Lead") upd.stage = "Contato realizado";
  if (!upd.follow_up) delete upd.follow_up;
  await supabase.from("leads").update(upd).eq("id", id);
  await logAction(supabase, profile, `registrou interação com o lead ${l?.brand_name || l?.company}`, "Leads", id);
  back(`/leads/${id}`, "Interação registrada.");
}

export async function convertLead(fd: FormData) {
  const { supabase, profile } = await requireModule("crm");
  if (!can(profile, "marcas")) back(`/leads/${g(fd, "id")}`, "Você precisa da permissão Marcas para converter.", false);
  const id = g(fd, "id");
  const { data: l } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!l) back("/leads", "Lead não encontrado.", false);
  if (l.brand_id) back(`/marcas/${l.brand_id}`, "Este lead já foi convertido.");
  const { data: b, error } = await supabase.from("brands").insert({
    name: l.brand_name || l.company, razao_social: l.company, cnpj: l.cnpj, segment: l.segment, category: l.category, site: l.site, instagram: l.instagram, tiktok: l.tiktok,
    contact_name: l.contact, contact_role: l.contact_role, email: l.email, phone: l.phone, whatsapp: l.phone, city: l.city, state: l.state,
    billing_model: "Mensal", owner_id: l.owner_id, status: "Negociação", notes: `Convertida do lead. Objetivo: ${l.objective || "—"}`,
  }).select("id").single();
  if (error) back(`/leads/${id}`, "Não foi possível converter: " + error.message, false);
  if ((can(profile, "fin")) && l.value) await supabase.from("brand_contracts").upsert({ brand_id: b.id, monthly_value: l.value, due_day: 10 });
  await supabase.from("leads").update({ brand_id: b.id, stage: "Cliente convertido", converted_at: new Date().toISOString(), last_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("lead_notes").insert({ lead_id: id, who: profile.name, text: "Lead convertido em marca cliente." });
  await logAction(supabase, profile, `converteu o lead ${l.brand_name || l.company} em marca`, "Leads", b.id);
  revalidatePath("/leads"); revalidatePath("/marcas");
  back(`/marcas/${b.id}`, "Lead convertido em marca. Complete os dados, o contrato e crie o acesso ao portal.");
}

export async function deleteLead(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back("/leads", "Só a CEO pode excluir.", false);
  const id = g(fd, "id");
  const { data: l } = await s.supabase.from("leads").select("company").eq("id", id).single();
  await s.supabase.from("leads").delete().eq("id", id);
  await logAction(s.supabase, s.profile!, `excluiu o lead ${l?.company || ""}`, "Leads", null);
  back("/leads", "Lead excluído.");
}
