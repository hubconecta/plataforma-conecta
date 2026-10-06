"use server";
// Assinatura eletrônica dos contratos de campanha (creator e marca).
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession, logAction } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/perms";
import { g, back, notifyModule } from "@/lib/act";

async function who() {
  const h = await headers();
  return { ip: (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim().slice(0, 60) || null, agent: (h.get("user-agent") || "").slice(0, 300) || null };
}
const cpfOk = (v: string) => { const d = v.replace(/\D/g, ""); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; const calc = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return calc(9) === Number(d[9]) && calc(10) === Number(d[10]); };

export async function signAsCreator(fd: FormData) {
  const s = await getSession();
  const id = g(fd, "id"), path = `/contrato/${id}`;
  if (!s.profile || s.profile.role !== "creator" || !s.profile.creator_id) back("/login", "Faça login.", false);
  const name = g(fd, "name").slice(0, 120), doc = g(fd, "doc");
  if (!fd.get("aceite") || !fd.get("imagem")) back(path, "Marque as duas confirmações para assinar.", false);
  if (name.split(" ").filter(Boolean).length < 2) back(path, "Digite seu nome completo.", false);
  if (!cpfOk(doc)) back(path, "CPF inválido. Confira os números.", false);
  const admin = createAdminClient();
  const { data: c } = await admin.from("contract_signatures").select("*, campaigns(name, brand_id)").eq("id", id).single();
  if (!c || c.creator_id !== s.profile!.creator_id) back("/contratos", "Contrato não encontrado.", false);
  if (c.status !== "Aguardando creator") back(path, "Este contrato já foi assinado por você.", false);
  const { data: tpl } = await admin.from("campaign_contracts").select("brand_signs").eq("campaign_id", c.campaign_id).maybeSingle();
  const w = await who();
  const status = tpl?.brand_signs === false ? "Assinado" : "Aguardando marca";
  await admin.from("contract_signatures").update({ status, creator_name: name, creator_doc: doc.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4"), creator_signed_at: new Date().toISOString(), creator_ip: w.ip, creator_agent: w.agent }).eq("id", id);
  const camp = (c as any).campaigns;
  if (status === "Aguardando marca" && camp?.brand_id) {
    const { data: bs } = await admin.from("profiles").select("id").eq("brand_id", camp.brand_id).eq("role", "marca").eq("status", "ativo");
    if (bs?.length) await admin.from("notifications").insert(bs.map((p: any) => ({ user_id: p.id, text: `✍️ ${name} assinou o contrato da campanha ${camp.name}. Falta a assinatura da marca.`, link: path })));
  }
  await notifyModule(admin, "campanhas", `✍️ ${name} assinou o contrato da campanha ${camp?.name || ""}`, `/contratos?campanha=${c.campaign_id}`);
  await logAction(s.supabase, s.profile!, `assinou o contrato da campanha ${camp?.name || ""}`, "Contratos", id);
  revalidatePath("/contratos");
  back(path, status === "Assinado" ? "Contrato assinado! ✅" : "Contrato assinado! ✅ Agora falta só a assinatura da marca.");
}

export async function signAsBrand(fd: FormData) {
  const s = await getSession();
  const id = g(fd, "id"), path = `/contrato/${id}`;
  if (!s.profile || s.profile.role !== "marca" || !s.profile.brand_id) back("/login", "Faça login.", false);
  const name = g(fd, "name").slice(0, 120), role = g(fd, "role").slice(0, 80);
  if (!fd.get("aceite")) back(path, "Marque a confirmação para assinar.", false);
  if (name.split(" ").filter(Boolean).length < 2) back(path, "Digite o nome completo de quem assina.", false);
  const admin = createAdminClient();
  const { data: c } = await admin.from("contract_signatures").select("*, campaigns(name, brand_id)").eq("id", id).single();
  if (!c || (c as any).campaigns?.brand_id !== s.profile!.brand_id) back("/contratos", "Contrato não encontrado.", false);
  if (c.status !== "Aguardando marca") back(path, c.status === "Aguardando creator" ? "A creator ainda não assinou." : "Este contrato já está assinado.", false);
  const w = await who();
  await admin.from("contract_signatures").update({ status: "Assinado", brand_signer: name, brand_signer_role: role || null, brand_signed_at: new Date().toISOString(), brand_ip: w.ip, brand_agent: w.agent }).eq("id", id);
  const { data: ps } = await admin.from("profiles").select("id").eq("creator_id", c.creator_id).eq("role", "creator").eq("status", "ativo");
  if (ps?.length) await admin.from("notifications").insert(ps.map((p: any) => ({ user_id: p.id, text: `✅ Contrato da campanha ${(c as any).campaigns?.name || ""} assinado pela marca. Está tudo certo!`, link: path })));
  await notifyModule(admin, "campanhas", `✅ Contrato assinado pelas duas partes: ${(c as any).campaigns?.name || ""}`, `/contratos?campanha=${c.campaign_id}`);
  await logAction(s.supabase, s.profile!, `assinou (marca) o contrato da campanha ${(c as any).campaigns?.name || ""}`, "Contratos", id);
  revalidatePath("/contratos");
  back(path, "Contrato assinado pela marca. ✅");
}

// Equipe: cancelar ou reenviar (gera de novo com o texto atual da campanha)
export async function manageContract(fd: FormData) {
  const s = await getSession();
  const id = g(fd, "id"), op = g(fd, "op"), path = g(fd, "back") || "/contratos";
  if (!s.profile || !can(s.profile, "campanhas") || s.profile.role === "marca") back(path, "Sem permissão.", false);
  const admin = createAdminClient();
  const { data: c } = await admin.from("contract_signatures").select("campaign_id,creator_id").eq("id", id).single();
  if (!c) back(path, "Contrato não encontrado.", false);
  if (op === "cancelar") await admin.from("contract_signatures").update({ status: "Cancelado" }).eq("id", id);
  if (op === "reenviar") {
    await admin.from("contract_signatures").update({ status: "Cancelado" }).eq("id", id);
    const { sendContract } = await import("@/lib/contracts");
    const ok = await sendContract(admin, c!.campaign_id, c!.creator_id);
    if (!ok) back(path, "Ative o contrato na campanha antes de reenviar.", false);
  }
  await logAction(s.supabase, s.profile!, `${op === "cancelar" ? "cancelou" : "reenviou"} um contrato de campanha`, "Campanhas", id);
  revalidatePath("/contratos");
  back(path, op === "cancelar" ? "Contrato cancelado." : "Contrato reenviado para a creator assinar.");
}
