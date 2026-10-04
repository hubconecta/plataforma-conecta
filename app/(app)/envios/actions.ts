"use server";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { can } from "@/lib/perms";
import { g, orNull, back, notifyProfiles, today } from "@/lib/act";

const CR_MSG: Record<string, string> = { Enviado: "📦 Seu produto foi enviado", "Em trânsito": "🚚 Seu produto está a caminho", Entregue: "✅ Seu produto foi entregue", Problema: "⚠️ Houve um problema com o seu envio" };

export async function newShipment(fd: FormData) {
  const { supabase, profile } = await requireModule("amostras");
  const row = { creator_id: g(fd, "creator_id"), brand_id: orNull(g(fd, "brand_id")), campaign_id: orNull(g(fd, "campaign_id")), product: g(fd, "product"), qty: Number(g(fd, "qty")) || 1, reason: g(fd, "reason") || "Ação de logística autorizada pela Conecta", status: "Aguardando envio", approved_by: profile.id, approved_at: new Date().toISOString() };
  if (!row.creator_id || !row.product) back("/envios", "Escolha a creator e informe o produto.", false);
  const { data, error } = await supabase.from("shipments").insert(row).select("id, creators(name)").single();
  if (error) back("/envios", error.message, false);
  if (row.brand_id) await notifyProfiles(supabase, { brand_id: row.brand_id }, `Novo envio autorizado: ${row.product} para ${(data as any).creators?.name}. Consulte os dados de envio.`, `/envios/${data.id}`);
  await notifyProfiles(supabase, { creator_id: row.creator_id }, `🎁 Você vai receber: ${row.product}`, "/clube/presskits");
  await logAction(supabase, profile, `autorizou envio de ${row.product} para ${(data as any).creators?.name}`, "Envios", data.id);
  revalidatePath("/envios");
  back(`/envios/${data.id}`, "Envio autorizado.");
}

export async function bulkSamples(fd: FormData) {
  const { supabase, profile } = await requireModule("amostras");
  const brand = orNull(g(fd, "brand_id")), camp = orNull(g(fd, "campaign_id")), product = g(fd, "product"), qty = Number(g(fd, "qty")) || 1;
  const crs = fd.getAll("creators").map(String);
  if (!product || !crs.length) back("/envios", "Informe o produto e escolha as creators.", false);
  const rows = crs.map((c) => ({ creator_id: c, brand_id: brand, campaign_id: camp, product, qty, reason: "Amostra autorizada pela Conecta", status: "Aguardando envio", approved_by: profile.id, approved_at: new Date().toISOString() }));
  const { error } = await supabase.from("shipments").insert(rows);
  if (error) back("/envios", error.message, false);
  if (brand) await notifyProfiles(supabase, { brand_id: brand }, `${crs.length} amostra(s) de ${product} autorizadas pela Conecta. Consulte os dados de envio.`, "/portal/envios");
  for (const c of crs) await notifyProfiles(supabase, { creator_id: c }, `🎁 Você vai receber uma amostra: ${product}`, "/clube/presskits");
  await logAction(supabase, profile, `autorizou ${crs.length} amostra(s) de ${product}`, "Envios", null);
  revalidatePath("/envios");
  back("/envios", `${crs.length} envio(s) criados.`);
}

export async function updateShipment(fd: FormData) {
  const s = await getSession();
  if (!s.profile) back("/login", "Faça login.", false);
  const staff = can(s.profile, "amostras") || can(s.profile, "presskits");
  const isBrand = s.profile!.role === "marca";
  if (!staff && !isBrand) back("/", "Sem permissão.", false);
  const id = g(fd, "id"), path = g(fd, "back") || `/envios/${id}`;
  const { data: sh } = await s.supabase.from("shipments").select("*, creators(name)").eq("id", id).single();
  if (!sh) back(path, "Envio não encontrado.", false);
  const status = g(fd, "status") || sh.status;
  const upd: any = { carrier: orNull(g(fd, "carrier")), tracking: orNull(g(fd, "tracking")), sent_at: orNull(g(fd, "sent_at")), eta: orNull(g(fd, "eta")), delivered_at: orNull(g(fd, "delivered_at")), status, notes: orNull(g(fd, "notes")) };
  if (staff) { upd.product = g(fd, "product") || sh.product; upd.qty = Number(g(fd, "qty")) || sh.qty; }
  if (status === "Entregue" && !upd.delivered_at) upd.delivered_at = today();
  if (["Enviado", "Em trânsito"].includes(status) && !upd.sent_at) upd.sent_at = today();
  const { error } = await s.supabase.from("shipments").update(upd).eq("id", id);
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  if (sh.pk_order_id && ["Preparando", "Enviado", "Em trânsito", "Entregue", "Cancelado"].includes(status) && staff) await s.supabase.from("pk_orders").update({ status, tracking: upd.tracking }).eq("id", sh.pk_order_id);
  if (status !== sh.status) {
    if (CR_MSG[status]) await notifyProfiles(s.supabase, { creator_id: sh.creator_id }, `${CR_MSG[status]}: ${sh.product}${upd.tracking ? ` · rastreio ${upd.tracking}` : ""}`, "/clube/presskits");
    if (staff && sh.brand_id) await notifyProfiles(s.supabase, { brand_id: sh.brand_id }, `Envio atualizado: ${sh.product} para ${(sh as any).creators?.name} · ${status}`, `/envios/${id}`);
  }
  await logAction(s.supabase, s.profile!, `atualizou o envio de ${sh.product} para ${(sh as any).creators?.name} (${status})`, "Envios", id);
  revalidatePath("/envios"); revalidatePath("/portal/envios");
  back(path, "Envio atualizado.");
}
