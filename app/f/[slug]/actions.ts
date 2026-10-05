"use server";
// Envio do formulário público. Quando o formulário é de uma marca, a creator
// entra na base daquela marca, pode criar o acesso dela na hora e, se quiser,
// marca que quer entrar na base completa da Conecta (ganha o Clube inteiro).
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: boolean; error?: string; account?: "created" | "exists" | "pending" | "none"; email?: string };

const clip = (v: any, n = 2000) => String(v ?? "").trim().slice(0, n);
const onlyDigits = (v: string) => v.replace(/\D/g, "");
const at = (v: string) => (v ? (v.startsWith("@") ? v : "@" + v.replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, "").replace(/\/.*$/, "")) : "");

export async function submitForm(formId: string, raw: Record<string, any>, opts: { join?: boolean; password?: string }): Promise<Result> {
  let admin;
  try { admin = createAdminClient(); } catch { return { ok: false, error: "Formulário indisponível no momento." }; }
  const { data: form } = await admin.from("forms").select("id,title,fields,status,brand_id,create_access,ask_join").eq("id", formId).maybeSingle();
  if (!form || form.status !== "Publicado") return { ok: false, error: "Este formulário foi encerrado." };

  // Limpa as respostas: só as perguntas do formulário, com tamanho limitado
  const fields: any[] = form.fields || [];
  const answers: Record<string, any> = {};
  for (const f of fields) {
    const v = raw?.[f.id];
    if (f.type === "multipla") answers[f.id] = (Array.isArray(v) ? v : []).map((x) => clip(x, 200)).filter((x) => (f.options || []).includes(x));
    else if (f.type === "endereco") { const o: any = {}; ["cep", "street", "number", "comp", "district", "city", "uf"].forEach((k) => (o[k] = clip(v?.[k], 200))); answers[f.id] = o; }
    else answers[f.id] = clip(v);
    const empty = f.type === "multipla" ? !answers[f.id].length : f.type === "endereco" ? !answers[f.id].street : !answers[f.id];
    if (f.req && empty) return { ok: false, error: `Responda: ${f.label}` };
  }

  // Quem está respondendo (se já tem login de creator)
  let loggedCreator: string | null = null;
  try {
    const sb = await createClient();
    const { data: u } = await sb.auth.getUser();
    if (u.user) { const { data: p } = await admin.from("profiles").select("role,creator_id").eq("id", u.user.id).single(); if (p?.role === "creator") loggedCreator = p.creator_id; }
  } catch {}

  const byType = (t: string) => fields.find((f) => f.type === t);
  const nameF = byType("nome") || fields.find((f) => f.type === "texto" && /nome/i.test(f.label));
  const name = nameF ? clip(answers[nameF.id], 120) : "";
  const email = byType("email") ? clip(answers[byType("email").id], 200).toLowerCase() : "";
  const phone = byType("telefone") ? onlyDigits(clip(answers[byType("telefone").id], 40)) : "";
  const ig = byType("instagram") ? at(clip(answers[byType("instagram").id], 100)) : "";
  const tt = byType("tiktok") ? at(clip(answers[byType("tiktok").id], 100)) : "";
  const addr = byType("endereco") ? answers[byType("endereco").id] : null;

  let creatorId: string | null = loggedCreator;
  let account: Result["account"] = "none";
  const join = !!(form.ask_join && opts?.join);

  if (form.brand_id) {
    if (!creatorId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Informe um e-mail válido." };
    let isNew = false;
    if (!creatorId) {
      // A mesma creator respondendo formulários de marcas diferentes fica num cadastro só:
      // procura pelo e-mail; se não achar, pelo Instagram e depois pelo WhatsApp.
      const esc = (v: string) => v.replace(/[\\%_]/g, (m) => "\\" + m);
      let found: any[] | null = (await admin.from("creators").select("id").ilike("email", esc(email)).limit(1)).data;
      if (!found?.length && ig.length > 2) found = (await admin.from("creators").select("id").ilike("instagram", esc(ig)).limit(1)).data;
      if (!found?.length && phone.length >= 10) found = (await admin.from("creators").select("id").eq("whatsapp", phone).limit(1)).data;
      if (found?.length) creatorId = found[0].id;
      else {
        if (!name) return { ok: false, error: "Informe seu nome." };
        const { data: cr, error } = await admin.from("creators").insert({ name, email, whatsapp: phone || null, instagram: ig || null, tiktok: tt || null, city: addr?.city || null, state: addr?.uf || null, status: "Nova", brand_only: !join }).select("id").single();
        if (error || !cr) return { ok: false, error: "Não foi possível enviar agora. Tente de novo em alguns minutos." };
        creatorId = cr.id; isNew = true;
      }
    }
    await admin.from("creator_brands").upsert({ creator_id: creatorId, brand_id: form.brand_id, source: "Formulário", form_id: form.id }, { onConflict: "creator_id,brand_id", ignoreDuplicates: true });

    // Endereço: só preenche se ainda não houver um cadastrado
    if (addr?.street) {
      const { data: has } = await admin.from("creator_addresses").select("creator_id").eq("creator_id", creatorId).maybeSingle();
      if (!has) await admin.from("creator_addresses").insert({ creator_id: creatorId, recipient: name || null, phone: phone || null, zip: onlyDigits(addr.cep || "") || null, street: addr.street, number: addr.number || null, complement: addr.comp || null, district: addr.district || null, city: addr.city || null, state: addr.uf || null });
    }

    // Quis entrar na base da Conecta → passa a ser creator da base completa (Clube inteiro)
    if (join && !isNew) await admin.from("creators").update({ brand_only: false }).eq("id", creatorId).eq("brand_only", true);

    // Acesso à plataforma
    if (form.create_access && !loggedCreator) {
      const { data: prof } = await admin.from("profiles").select("id,role").ilike("email", email).limit(1);
      if (prof?.length) account = "exists";
      else if (!isNew) account = "pending"; // creator que já estava na base: a equipe libera o link (proteção da conta dela)
      else {
        const pw = String(opts?.password || "");
        if (pw.length < 8) return { ok: false, error: "Crie uma senha com pelo menos 8 caracteres." };
        const { data: nu, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { name } });
        if (error || !nu?.user) account = "pending";
        else {
          await admin.from("profiles").update({ role: "creator", creator_id: creatorId, name, status: "ativo", access_status: "ativo" }).eq("id", nu.user.id);
          account = "created";
        }
      }
    }
  }

  const { error } = await admin.from("form_responses").insert({ form_id: form.id, creator_id: creatorId, answers, join_conecta: form.ask_join ? join : null });
  if (error) return { ok: false, error: "Não foi possível enviar agora. Tente de novo em alguns minutos." };
  return { ok: true, account, email };
}
