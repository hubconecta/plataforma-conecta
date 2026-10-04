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
  const { supabase, user, profile } = await getSession();
  const email = g(fd, "email").toLowerCase(), path = g(fd, "back") || "/";
  if (!user || !profile || !["ceo", "equipe"].includes(profile.role)) back("/login", "Faça login de novo.", false);
  const admin = createAdminClient();
  const { data: tp } = await admin.from("profiles").select("id,role,name").eq("email", email).maybeSingle();
  const need: Record<string, string> = { marca: "marcas", equipe: "colaboradoras", creator: "creators", financeiro: "colaboradoras" };
  if (!tp || tp.role === "ceo" || !can(profile, need[tp.role] || "colaboradoras")) back(path, "Sem permissão para este acesso.", false);
  const r = await accessLink(admin, email);
  if ("error" in r) back(path, "Não foi possível gerar o novo link: " + r.error, false);
  await logAction(supabase, profile, `gerou novo link de acesso para ${email}`, "Acessos", tp.id);
  await showLink(email, tp.name || "", r.link);
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
  const { data: c0 } = await supabase.from("campaigns").select("commission_pct").eq("id", id).single();
  (results as any).commissions = Math.round((results.gmv || 0) * (Number(c0?.commission_pct) || 0)) / 100;
  const { data: c } = await supabase.from("campaigns").update({ results }).eq("id", id).select("name,brand_id").single();
  if (c) {
    await supabase.from("report_entries").insert({ brand_id: c.brand_id, kind: "Campanha", ref_id: id, title: `Resultados atualizados · ${c.name}`, summary: `${results.creators} creators, ${results.views.toLocaleString("pt-BR")} visualizações, ${results.clicks.toLocaleString("pt-BR")} cliques, ${results.orders} pedidos, R$ ${results.gmv.toLocaleString("pt-BR")} em vendas.`, by_name: profile.name });
    await notifyProfiles(supabase, { brand_id: c.brand_id }, `Relatório atualizado: ${c.name}`, "/relatorios");
  }
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
      const { data: cp } = await supabase.from("campaigns").select("requires_shipping, product, brand_id").eq("id", a.campaign_id).single();
      let shipId: string | null = null;
      if (cp?.requires_shipping) {
        const { data: ex } = await supabase.from("shipments").select("id").eq("campaign_id", a.campaign_id).eq("creator_id", a.creator_id).limit(1);
        if (ex?.length) shipId = ex[0].id;
        else { const { data: sh } = await supabase.from("shipments").insert({ creator_id: a.creator_id, brand_id: cp.brand_id, campaign_id: a.campaign_id, product: cp.product || `Produto da campanha ${cname}`, qty: 1, reason: "Aprovada em campanha com envio", status: "Aguardando envio", approved_by: profile.id, approved_at: new Date().toISOString() }).select("id").single(); shipId = sh?.id || null; }
      }
      await notifyProfiles(supabase, { brand_id: (a as any).campaigns?.brand_id }, `Creator aprovada: ${crname} em ${cname}${shipId ? ". A campanha envolve envio de produto: consulte os dados de envio." : ""}`, shipId ? `/envios/${shipId}` : "/campanhas");
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

/* ---------------- Acesso da creator ao Clube ---------------- */
export async function creatorAccess(fd: FormData) {
  const { supabase, profile } = await requireModule("creators");
  const id = g(fd, "creator_id");
  const { data: c } = await supabase.from("creators").select("id,name,email").eq("id", id).single();
  if (!c?.email) back("/creators", "Esta creator não tem e-mail cadastrado.", false);
  const admin = createAdminClient();
  const r = await accessLink(admin, String(c.email).toLowerCase(), c.name);
  if ("error" in r) back("/creators", "Não foi possível gerar o acesso: " + r.error, false);
  const { data: existing } = await admin.from("profiles").select("role").eq("id", r.user.id).single();
  if (existing && !["pendente", "creator"].includes(existing.role)) back("/creators", "Este e-mail já é usado por outro tipo de acesso na plataforma.", false);
  await admin.from("profiles").update({ role: "creator", creator_id: c.id, name: c.name, access_status: "convite_enviado", status: "ativo" }).eq("id", r.user.id);
  await logAction(supabase, profile, `gerou o acesso ao Clube Conecta para ${c.name}`, "Creators", c.id);
  await showLink(c.email, c.name, r.link);
  back("/creators", `Link do Clube Conecta gerado para ${c.name}. Envie o link que apareceu no topo da tela.`);
}

/* ---------------- Exclusões (só CEO) ---------------- */
async function requireCeo(path: string) {
  const s = await getSession();
  if (!s.user || s.profile?.role !== "ceo") back(path, "Só a CEO pode excluir cadastros.", false);
  return s as any;
}

// Apaga o login e solta as referências, mantendo o histórico (com o nome de quem fez).
async function removeUser(admin: any, id: string) {
  await admin.from("brands").update({ owner_id: null }).eq("owner_id", id);
  await admin.from("campaign_applications").update({ reviewed_by: null }).eq("reviewed_by", id);
  await admin.from("audit_logs").update({ user_id: null }).eq("user_id", id);
  const { error } = await admin.auth.admin.deleteUser(id);
  return error?.message;
}

export async function deleteUserAccess(fd: FormData) {
  const path = g(fd, "back") || "/colaboradoras";
  const { supabase, profile } = await requireCeo(path);
  const id = g(fd, "id");
  if (id === profile.id) back(path, "Você não pode excluir o seu próprio acesso.", false);
  const admin = createAdminClient();
  const { data: t } = await admin.from("profiles").select("role,name,email").eq("id", id).single();
  if (!t || t.role === "ceo") back(path, "Este acesso não pode ser excluído.", false);
  const err = await removeUser(admin, id);
  if (err) back(path, "Não foi possível excluir: " + err, false);
  await logAction(supabase, profile, `excluiu o acesso de ${t.name || ""} (${t.email})`, "Acessos", null);
  back(path, `Acesso de ${t.email} excluído.`);
}

export async function deleteBrand(fd: FormData) {
  const id = g(fd, "id");
  const { supabase, profile } = await requireCeo(`/marcas/${id}`);
  const admin = createAdminClient();
  const { data: b } = await admin.from("brands").select("name").eq("id", id).single();
  if (!b) back("/marcas", "Marca não encontrada.", false);
  const { count } = await admin.from("campaigns").select("id", { count: "exact", head: true }).eq("brand_id", id);
  if (count) back(`/marcas/${id}`, `${b.name} tem ${count} campanha(s). Para não perder o histórico, mude o status da marca para Inativa em vez de excluir.`, false);
  const { data: us } = await admin.from("profiles").select("id").eq("brand_id", id).eq("role", "marca");
  for (const u of us || []) await removeUser(admin, u.id);
  const { error } = await admin.from("brands").delete().eq("id", id);
  if (error) back(`/marcas/${id}`, "Não foi possível excluir: " + error.message, false);
  await logAction(supabase, profile, `excluiu a marca ${b.name}`, "Marcas", null);
  revalidatePath("/marcas");
  back("/marcas", `Marca ${b.name} excluída.`);
}

export async function deleteCreator(fd: FormData) {
  const { supabase, profile } = await requireCeo("/creators");
  const id = g(fd, "id");
  const admin = createAdminClient();
  const { data: c } = await admin.from("creators").select("name").eq("id", id).single();
  if (!c) back("/creators", "Creator não encontrada.", false);
  const { data: us } = await admin.from("profiles").select("id").eq("creator_id", id).eq("role", "creator");
  for (const u of us || []) await removeUser(admin, u.id);
  await admin.from("creator_applications").update({ creator_id: null }).eq("creator_id", id);
  const { error } = await admin.from("creators").delete().eq("id", id);
  if (error) back("/creators", "Não foi possível excluir: " + error.message, false);
  await logAction(supabase, profile, `excluiu a creator ${c.name}`, "Creators", null);
  revalidatePath("/creators");
  back("/creators", `${c.name} foi excluída.`);
}

export async function deleteApplication(fd: FormData) {
  const { supabase, profile } = await requireCeo("/cadastros");
  const id = g(fd, "id");
  const admin = createAdminClient();
  const { data: a } = await admin.from("creator_applications").select("name").eq("id", id).single();
  const { error } = await admin.from("creator_applications").delete().eq("id", id);
  if (error) back("/cadastros", "Não foi possível excluir: " + error.message, false);
  await logAction(supabase, profile, `excluiu o cadastro de ${a?.name || "creator"}`, "Cadastros de creators", null);
  back("/cadastros", "Cadastro excluído.");
}

/* ---------------- Campanha proposta pela marca ---------------- */
export async function proposeCampaign(fd: FormData) {
  const { supabase, profile } = await requireModule("campanhas");
  if (profile.role !== "marca" || !profile.brand_id) back("/campanhas", "Sem permissão.", false);
  const id = g(fd, "id");
  const row: any = { brand_id: profile.brand_id, name: g(fd, "name"), product: orNull(g(fd, "product")), objective: orNull(g(fd, "objective")), description: orNull(g(fd, "description")), briefing: orNull(g(fd, "briefing")), start_date: orNull(g(fd, "start_date")), end_date: orNull(g(fd, "end_date")), slots: Number(g(fd, "slots")) || 10, niche: orNull(g(fd, "niche")), requirements: orNull(g(fd, "requirements")), deliverables: orNull(g(fd, "deliverables")), requires_shipping: !!fd.get("requires_shipping"), budget: Number(g(fd, "budget")) || null, status: "Em aprovação", proposed_by: profile.id };
  if (!row.name) back("/campanhas", "Dê um nome à campanha.", false);
  if (row.start_date && row.end_date && row.end_date < row.start_date) back("/campanhas", "A data final precisa ser depois do início.", false);
  const { error } = id ? await supabase.from("campaigns").update(row).eq("id", id) : await supabase.from("campaigns").insert(row);
  if (error) back("/campanhas", "Não foi possível enviar: " + error.message, false);
  await logAction(supabase, profile, `enviou a campanha ${row.name} para aprovação`, "Campanhas", id || null);
  revalidatePath("/campanhas");
  back("/campanhas", "Campanha enviada para aprovação da Conecta. Você será avisada pela plataforma.");
}

export async function reviewCampaign(fd: FormData) {
  const { supabase, profile } = await requireModule("campanhas");
  if (profile.role === "marca") back("/campanhas", "Sem permissão.", false);
  const id = g(fd, "id"), status = g(fd, "status"), note = orNull(g(fd, "note"));
  const { data: c } = await supabase.from("campaigns").update({ status, review_note: ["Ajuste solicitado", "Recusada"].includes(status) ? note : null }).eq("id", id).select("name,brand_id").single();
  if (!c) back("/campanhas", "Campanha não encontrada.", false);
  const msg = status === "Ajuste solicitado" ? `✏️ A Conecta pediu ajustes na campanha ${c.name}${note ? ": " + note : ""}` : status === "Recusada" ? `A campanha ${c.name} não foi aprovada${note ? ": " + note : ""}` : `✅ Campanha aprovada pela Conecta: ${c.name} (${status})`;
  await notifyProfiles(supabase, { brand_id: c.brand_id }, msg, "/campanhas");
  await logAction(supabase, profile, `${status === "Ajuste solicitado" ? "pediu ajuste na" : status === "Recusada" ? "recusou a" : "aprovou a"} campanha ${c.name}`, "Campanhas", id);
  revalidatePath("/campanhas");
  back("/campanhas", `Campanha ${c.name}: ${status}.`);
}
