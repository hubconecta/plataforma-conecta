"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { g, orNull, num, back, notifyProfiles } from "@/lib/act";

export async function savePressKit(fd: FormData) {
  const { supabase, profile } = await requireModule("presskits");
  const id = g(fd, "id"), path = g(fd, "back") || "/presskits";
  const row = { brand_id: orNull(g(fd, "brand_id")), name: g(fd, "name"), description: orNull(g(fd, "description")), items: orNull(g(fd, "items")), qty: Number(g(fd, "qty")) || 1, cost: num(fd, "cost"), price: num(fd, "price"), stock: Number(g(fd, "stock")) || 0, type: g(fd, "type") || "Gratuito", checkout_url: orNull(g(fd, "checkout_url")), b4you_id: orNull(g(fd, "b4you_id")), status: g(fd, "status") || "Rascunho", photo_path: orNull(g(fd, "photo_path")) };
  if (!row.name) back(path, "Dê um nome ao press kit.", false);
  const { error } = id ? await supabase.from("press_kits").update(row).eq("id", id) : await supabase.from("press_kits").insert(row);
  if (error) back(path, "Não foi possível salvar: " + error.message, false);
  await logAction(supabase, profile, `${id ? "editou" : "criou"} o press kit ${row.name} (${row.status})`, "Press kits", id || null);
  revalidatePath("/presskits");
  back(path, id ? "Press kit atualizado." : "Press kit criado.");
}

// Cria o envio do press kit (a marca passa a ver o endereço desta creator para este envio).
async function shipFor(supabase: any, profile: any, o: any, reason: string) {
  const { data: ex } = await supabase.from("shipments").select("id").eq("pk_order_id", o.id).limit(1);
  if (ex?.length) return ex[0].id;
  const { data } = await supabase.from("shipments").insert({ creator_id: o.creator_id, brand_id: o.press_kits?.brand_id, pk_order_id: o.id, product: o.press_kits?.name || "Press kit", qty: 1, reason, status: "Preparando", approved_by: profile.id, approved_at: new Date().toISOString() }).select("id").single();
  return data?.id;
}

export async function setOrderStatus(fd: FormData) {
  const { supabase, profile } = await requireModule("presskits");
  const id = g(fd, "id"), status = g(fd, "status"), path = g(fd, "back") || "/presskits?tab=pedidos";
  const { data: o } = await supabase.from("pk_orders").select("*, press_kits(name,brand_id), creators(name)").eq("id", id).single();
  if (!o) back(path, "Pedido não encontrado.", false);
  const kit = o.press_kits?.name, cr = o.creators?.name;
  if (status === "Pago") {
    await supabase.from("pk_orders").update({ status: "Preparando", payment: "Pago" }).eq("id", id);
    const sid = await shipFor(supabase, profile, o, "Compra de press kit confirmada");
    await notifyProfiles(supabase, { creator_id: o.creator_id }, `✅ Compra confirmada! Seu press kit ${kit} está sendo preparado.`, "/clube/presskits");
    if (o.press_kits?.brand_id) await notifyProfiles(supabase, { brand_id: o.press_kits.brand_id }, `Nova compra de Press Kit: a creator ${cr} comprou ${kit}. Pagamento confirmado. Consulte os dados de envio.`, `/envios/${sid}`);
  } else if (status === "Preparando") {
    await supabase.from("pk_orders").update({ status }).eq("id", id);
    const sid = await shipFor(supabase, profile, o, "Aprovada para receber press kit");
    await notifyProfiles(supabase, { creator_id: o.creator_id }, `🎁 Você foi aprovada para receber o press kit ${kit}`, "/clube/presskits");
    if (o.press_kits?.brand_id) await notifyProfiles(supabase, { brand_id: o.press_kits.brand_id }, `Creator aprovada para Press Kit: ${cr} · ${kit}. Consulte os dados de envio.`, `/envios/${sid}`);
  } else {
    const tracking = orNull(g(fd, "tracking")) || o.tracking;
    await supabase.from("pk_orders").update({ status, tracking }).eq("id", id);
    if (["Enviado", "Em trânsito", "Entregue", "Cancelado"].includes(status)) await supabase.from("shipments").update({ status, tracking }).eq("pk_order_id", id);
    await notifyProfiles(supabase, { creator_id: o.creator_id }, `📦 Seu press kit ${kit}: ${status}${tracking ? ` · rastreio ${tracking}` : ""}`, "/clube/presskits");
  }
  await logAction(supabase, profile, `marcou o pedido de ${kit} de ${cr} como ${status}`, "Press kits", id);
  revalidatePath("/presskits"); revalidatePath("/envios");
  back(path, `Pedido de ${cr}: ${status}.`);
}

/* ----- Creator ----- */
export async function requestPressKit(fd: FormData) {
  const s = await getSession();
  if (!s.profile?.creator_id) redirect("/login");
  const id = g(fd, "id");
  const { data: k } = await s.supabase.from("press_kits").select("*").eq("id", id).eq("status", "Ativo").single();
  if (!k) back("/clube/presskits", "Este press kit não está disponível.", false);
  const { data: open } = await s.supabase.from("pk_orders").select("id").eq("pk_id", id).eq("creator_id", s.profile.creator_id).not("status", "in", "(Entregue,Cancelado)").limit(1);
  if (open?.length) back("/clube/presskits", "Você já tem um pedido deste press kit em andamento.", false);
  const paid = ["Compra", "Renovação"].includes(k.type) && Number(k.price) > 0;
  const { error } = await s.supabase.from("pk_orders").insert({ creator_id: s.profile.creator_id, pk_id: id, value: paid ? k.price : 0, status: paid ? "Aguardando pagamento" : "Preparando", payment: paid ? "Aguardando" : "Gratuito", order_code: "PK-" + Date.now().toString().slice(-6) });
  if (error) back("/clube/presskits", "Não foi possível fazer o pedido agora.", false);
  await logAction(s.supabase, s.profile, `pediu o press kit ${k.name}`, "Press kits", id);
  if (paid && k.checkout_url) redirect(k.checkout_url);
  back("/clube/presskits", paid ? "Pedido registrado. Assim que o pagamento for confirmado, a Conecta prepara o envio." : "Pedido enviado! A equipe Conecta vai aprovar e preparar o envio.");
}
