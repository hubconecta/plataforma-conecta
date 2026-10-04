"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/perms";
import { cookies } from "next/headers";
import { accessLink, showLink } from "@/lib/access";

const g = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const orNull = (v: string) => (v === "" ? null : v);
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "";
const back = (path: string, msg: string, ok = true): never => redirect(`${path}?${ok ? "ok" : "erro"}=${encodeURIComponent(msg)}`);

async function notifyProfiles(supabase: any, filter: { creator_id?: string; brand_id?: string }, text: string, link: string) {
  let q = supabase.from("profiles").select("id");
  if (filter.creator_id) q = q.eq("creator_id", filter.creator_id);
  if (filter.brand_id) q = q.eq("brand_id", filter.brand_id).eq("role", "marca");
  const { data } = await q;
  if (data?.length) await supabase.from("notifications").insert(data.map((p: any) => ({ user_id: p.id, text, link })));
}

/* ---------------- Marcas ---------------- */
export async function saveBrand(fd: FormData) {
  const { supabase, profile } = await requireModule("marcas");
  const id = g(fd, "id");
  const row = {
    name: g(fd, "name"), razao_social: orNull(g(fd, "razao_social")), cnpj: orNull(g(fd, "cnpj")), segment: orNull(g(fd, "segment")), category: orNull(g(fd, "category")),
    site: orNull(g(fd, "site")), instagram: orNull(g(fd, "instagram")), tiktok: orNull(g(fd, "tiktok")),
    contact_name: orNull(g(fd, "contact_name")), contact_role: orNull(g(fd, "contact_role")), email: orNull(g(fd, "email")), phone: orNull(g(fd, "phone")), whatsapp: orNull(g(fd, "whatsapp")),
    address: orNull(g(fd, "address")), city: orNull(g(fd, "city")), state: orNull(g(fd, "state")), zip: orNull(g(fd, "zip")),
    start_date: orNull(g(fd, "start_date")), renewal_date: orNull(g(fd, "renewal_date")), contract_type: orNull(g(fd, "contract_type")), hiring_model: orNull(g(fd, "hiring_model")), billing_model: orNull(g(fd, "billing_model")),
    owner_id: orNull(g(fd, "owner_id")), status: g(fd, "status") || "Lead", notes: orNull(g(fd, "notes")),
  };
  if (!row.name) back(id ? `/marcas/${id}` : "/marcas/nova", "Informe o nome da marca.", false);
  let brandId = id;
  if (id) {
    const { error } = await supabase.from("brands").update(row).eq("id", id);
    if (error) back(`/marcas/${id}`, "Não foi possível salvar: " + error.message, false);
  } else {
    const { data, error } = await supabase.from("brands").insert(row).select("id").single();
    if (error) back("/marcas/nova", "Não foi possível cadastrar: " + error.message, false);
    brandId = data.id;
  }
  if (can(profile, "fin") && fd.has("monthly_value")) {
    await supabase.from("brand_contracts").upsert({ brand_id: brandId, monthly_value: Number(g(fd, "monthly_value")) || null, commission_pct: Number(g(fd, "commission_pct")) || null, due_day: Number(g(fd, "due_day")) || null, updated_at: new Date().toISOString() });
  }
  await logAction(supabase, profile, `${id ? "editou" : "cadastrou"} a marca ${row.name}`, "Marcas", brandId);
  revalidatePath("/marcas");
  back(`/marcas/${brandId}`, id ? "Marca atualizada." : "Marca cadastrada.");
}

export async function createBrandAccess(fd: FormData) {
  const { supabase, profile } = await requireModule("marcas");
  const brandId = g(fd, "brand_id"), email = g(fd, "email").toLowerCase(), name = g(fd, "name");
  if (!email || !name) back(`/marcas/${brandId}`, "Informe nome e e-mail do responsável.", false);
  let admin;
  try { admin = createAdminClient(); } catch (e: any) { back(`/marcas/${brandId}`, e.message, false); }
  const r = await accessLink(admin, email, name);
  if ("error" in r) back(`/marcas/${brandId}`, "Não foi possível criar o acesso: " + r.error, false);
  const { data: existing } = await admin.from("profiles").select("role").eq("id", r.user.id).single();
  if (existing && !["pendente", "marca"].includes(existing.role)) back(`/marcas/${brandId}`, "Este e-mail já é usado por outro tipo de acesso na plataforma.", false);
  await admin.from("profiles").update({ role: "marca", brand_id: brandId, name, cargo: orNull(g(fd, "cargo")), whatsapp: orNull(g(fd, "whatsapp")), access_status: "convite_enviado", status: "ativo" }).eq("id", r.user.id);
  await logAction(supabase, profile, `criou o acesso do Portal da Marca para ${email}`, "Acesso da marca", brandId);
  await showLink(email, name, r.link);
  back(`/marcas/${brandId}`, `Acesso criado para ${email}. Envie o link de primeiro acesso que apareceu no topo da tela.`);
}

export async function resendAccess(fd: FormData) {
  const { supabase, profile } = await requireModule("marcas");
  const email = g(fd, "email"), path = g(fd, "back") || "/marcas";
  let admin;
  try { admin = createAdminClient(); } catch (e: any) { back(path, e.message, false); }
  const r = await accessLink(admin, email);
  if ("error" in r) back(path, "Não foi possível gerar o novo link: " + r.error, false);
  const { data: tp } = await admin.from("profiles").select("role,name").eq("id", r.user.id).single();
  if (tp && tp.role !== "marca" && profile.role !== "ceo" && !can(profile, "colaboradoras")) back(path, "Sem permissão para este acesso.", false);
  await logAction(supabase, profile, `gerou novo link de acesso para ${email}`, "Acessos");
  await showLink(email, tp?.name || "", r.link);
  back(path, `Novo link gerado para ${email}. Envie o link que apareceu no topo da tela.`);
}

export async function setUserStatus(fd: FormData) {
  const { profile } = await requireModule("marcas");
  const id = g(fd, "id"), status = g(fd, "status"), path = g(fd, "back") || "/marcas";
  if (profile.role !== "ceo" && !can(profile, "colaboradoras")) {
    // equipe com permissão de marcas só altera acessos de marca
  }
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role,email").eq("id", id).single();
  if (!target || (target.role !== "marca" && profile.role !== "ceo")) back(path, "Sem permissão para alterar este acesso.", false);
  await admin.from("profiles").update({ status, access_status: status === "ativo" ? "ativo" : status }).eq("id", id);
  const s = await getSession();
  await logAction(s.supabase, profile, `alterou o acesso de ${target.email} para ${status}`, "Acessos", id);
  back(path, "Acesso atualizado.");
}

/* ---------------- Colaboradoras ---------------- */
export async function saveTeamMember(fd: FormData) {
  const { supabase, profile } = await requireModule("colaboradoras");
  const id = g(fd, "id");
  const perms = fd.getAll("perm").map(String);
  const data = { name: g(fd, "name"), cargo: orNull(g(fd, "cargo")), departamento: orNull(g(fd, "departamento")), whatsapp: orNull(g(fd, "whatsapp")), responsabilidades: orNull(g(fd, "responsabilidades")), entrada: orNull(g(fd, "entrada")), perms, status: g(fd, "status") || "ativo" };
  if (id) {
    const { error } = await supabase.from("profiles").update(data).eq("id", id);
    if (error) back("/colaboradoras", "Não foi possível salvar: " + error.message, false);
    await logAction(supabase, profile, `atualizou dados e permissões de ${data.name}`, "Colaboradoras", id);
    back("/colaboradoras", "Colaboradora atualizada.");
  }
  const email = g(fd, "email").toLowerCase();
  const admin = createAdminClient();
  if (!email || !data.name) back("/colaboradoras", "Informe nome e e-mail.", false);
  const r = await accessLink(admin, email, data.name);
  if ("error" in r) back("/colaboradoras", "Não foi possível convidar: " + r.error, false);
  const { data: existing } = await admin.from("profiles").select("role").eq("id", r.user.id).single();
  if (existing && !["pendente", "equipe"].includes(existing.role)) back("/colaboradoras", "Este e-mail já é usado por outro tipo de acesso na plataforma.", false);
  await admin.from("profiles").update({ ...data, role: "equipe", access_status: "convite_enviado" }).eq("id", r.user.id);
  await logAction(supabase, profile, `convidou a colaboradora ${data.name} (${email})`, "Colaboradoras", r.user.id);
  await showLink(email, data.name, r.link);
  back("/colaboradoras", `Acesso criado para ${data.name}. Envie o link de primeiro acesso que apareceu no topo da tela.`);
}

/* ---------------- Cadastros de creators ---------------- */
export async function setApplicationStatus(fd: FormData) {
  const { supabase, profile } = await requireModule("cad_creators");
  const id = g(fd, "id"), status = g(fd, "status");
  const { data: app } = await supabase.from("creator_applications").select("*").eq("id", id).single();
  if (!app) back("/cadastros", "Cadastro não encontrado.", false);
  if (status === "Aprovada") {
    const a = app.answers || {};
    const { data: cr, error } = await supabase.from("creators").insert({ name: app.name, artist_name: a.artist || null, email: app.email, whatsapp: app.whatsapp, city: app.city, state: app.state, instagram: app.instagram, tiktok: app.tiktok, niche: app.niche, kind: app.kind, followers: parseInt(String(a.followers || "").replace(/\D/g, "")) || 0, status: "Nova" }).select("id").single();
    if (error) back("/cadastros", "Não foi possível ativar: " + error.message, false);
    await supabase.from("creator_applications").update({ status, creator_id: cr.id }).eq("id", id);
    if (fd.get("invite")) {
      try {
        const admin = createAdminClient();
        const r = await accessLink(admin, String(app.email).toLowerCase(), app.name);
        if (!("error" in r)) {
          const { data: existing } = await admin.from("profiles").select("role").eq("id", r.user.id).single();
          if (!existing || ["pendente", "creator"].includes(existing.role)) {
            await admin.from("profiles").update({ role: "creator", creator_id: cr.id, name: app.name, access_status: "convite_enviado", status: "ativo" }).eq("id", r.user.id);
            await showLink(app.email, app.name, r.link);
          }
        }
      } catch {}
    }
    await logAction(supabase, profile, `aprovou o cadastro de ${app.name} e ativou como creator`, "Cadastros de creators", cr.id);
    revalidatePath("/creators");
    back("/cadastros", `${app.name} agora é creator${fd.get("invite") ? ". Envie o link do Clube Conecta que apareceu no topo da tela" : ""}.`);
  }
  await supabase.from("creator_applications").update({ status }).eq("id", id);
  await logAction(supabase, profile, `marcou o cadastro de ${app.name} como ${status}`, "Cadastros de creators", id);
  back("/cadastros", `Cadastro atualizado: ${status}.`);
}

/* ---------------- Campanhas ---------------- */
export async function saveCampaign(fd: FormData) {
  const { supabase, profile } = await requireModule("campanhas");
  const id = g(fd, "id");
  const row = { brand_id: g(fd, "brand_id"), name: g(fd, "name"), product: orNull(g(fd, "product")), objective: orNull(g(fd, "objective")), description: orNull(g(fd, "description")), briefing: orNull(g(fd, "briefing")), status: g(fd, "status") || "Futura", start_date: orNull(g(fd, "start_date")), end_date: orNull(g(fd, "end_date")), slots: Number(g(fd, "slots")) || 10, fee: Number(g(fd, "fee")) || null, commission_pct: Number(g(fd, "commission_pct")) || null, niche: orNull(g(fd, "niche")), requirements: orNull(g(fd, "requirements")), deliverables: orNull(g(fd, "deliverables")), requires_shipping: !!fd.get("requires_shipping") };
  if (!row.brand_id || !row.name) back("/campanhas", "Escolha a marca e dê um nome à campanha.", false);
  let cid = id;
  if (id) { const { error } = await supabase.from("campaigns").update(row).eq("id", id); if (error) back("/campanhas", error.message, false); }
  else { const { data, error } = await supabase.from("campaigns").insert(row).select("id").single(); if (error) back("/campanhas", error.message, false); cid = data.id; }
  await logAction(supabase, profile, `${id ? "editou" : "criou"} a campanha ${row.name}`, "Campanhas", cid);
  revalidatePath("/campanhas");
  back("/campanhas", id ? "Campanha atualizada." : "Campanha criada.");
}

export async function saveResults(fd: FormData) {
  const { supabase, profile } = await requireModule("campanhas");
  const id = g(fd, "id");
  const results: Record<string, number> = {};
  ["creators", "concluded", "views", "interactions", "clicks", "orders", "gmv"].forEach((k) => (results[k] = Number(g(fd, k)) || 0));
  const { data: c } = await supabase.from("campaigns").update({ results }).eq("id", id).select("name,brand_id").single();
  if (c) await notifyProfiles(supabase, { brand_id: c.brand_id }, `Relatório atualizado: ${c.name}`, "/portal");
  await logAction(supabase, profile, `atualizou os resultados da campanha ${c?.name}`, "Campanhas", id);
  back("/campanhas", "Resultados salvos. O portal da marca já mostra os novos números.");
}

export async function setCampaignAppStatus(fd: FormData) {
  const { supabase, profile } = await requireModule("candidaturas");
  const id = g(fd, "id"), status = g(fd, "status");
  const { data: a } = await supabase.from("campaign_applications").update({ status, reviewed_by: profile.id }).eq("id", id).select("creator_id, campaign_id, campaigns(name, brand_id), creators(name)").single();
  if (a) {
    const cname = (a as any).campaigns?.name, crname = (a as any).creators?.name;
    if (status === "Aprovada") {
      await notifyProfiles(supabase, { creator_id: a.creator_id }, `🎉 Você foi aprovada na campanha ${cname}!`, "/clube/minhas");
      await notifyProfiles(supabase, { brand_id: (a as any).campaigns?.brand_id }, `Creator aprovada: ${crname} em ${cname}`, "/portal");
    } else if (status === "Reprovada") await notifyProfiles(supabase, { creator_id: a.creator_id }, `Sua inscrição para ${cname} não foi aprovada desta vez`, "/clube/minhas");
    else if (status === "Lista de espera") await notifyProfiles(supabase, { creator_id: a.creator_id }, `Você está na lista de espera de ${cname}`, "/clube/minhas");
    await logAction(supabase, profile, `marcou a inscrição de ${crname} em ${cname} como ${status}`, "Inscrições", id);
  }
  back("/inscricoes", `Inscrição atualizada: ${status}.`);
}

/* ---------------- Creator ---------------- */
export async function applyToCampaign(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "campaign_id");
  const { error } = await s.supabase.from("campaign_applications").insert({ campaign_id: id, creator_id: s.profile.creator_id, answers: { motivo: g(fd, "motivo"), formato: g(fd, "formato") } });
  if (error) back("/clube/oportunidades", error.message.includes("duplicate") ? "Você já se inscreveu nesta campanha." : "Não foi possível enviar: " + error.message, false);
  await logAction(s.supabase, s.profile, "enviou inscrição para uma campanha", "Inscrições", id);
  back("/clube/minhas", "Inscrição enviada! Você será avisada quando houver uma resposta.");
}

/* ---------------- Notificações ---------------- */
export async function readAllNotifications() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  await s.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", s.user.id).is("read_at", null);
  revalidatePath("/", "layout");
  redirect("/notificacoes");
}

export async function dismissLink() {
  (await cookies()).delete("cx_link");
  revalidatePath("/", "layout");
}
