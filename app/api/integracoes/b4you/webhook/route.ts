import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Recebe os avisos (webhooks) da B4YOU.
// Configure na B4YOU (Apps > Webhooks) a URL mostrada em Club Criadora (admin).
// Todo evento é guardado. O acesso a um produto do Club Criadora só é liberado quando o evento indica
// pagamento aprovado, o produto bate com o cadastrado e o e-mail é de uma creator; senão fica "Para revisar".

function walk(o: any, fn: (k: string, v: any) => void, depth = 0) {
  if (!o || typeof o !== "object" || depth > 6) return;
  for (const [k, v] of Object.entries(o)) { fn(k, v); if (v && typeof v === "object") walk(v, fn, depth + 1); }
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const { data: cfg } = await admin.from("settings").select("value").eq("key", "b4you").maybeSingle();
  const token = req.nextUrl.searchParams.get("token") || req.headers.get("x-webhook-token") || "";
  if (!cfg?.value?.token || token !== cfg.value.token) return NextResponse.json({ ok: false }, { status: 401 });

  let payload: any = {};
  const raw = await req.text();
  try { payload = JSON.parse(raw); } catch { payload = Object.fromEntries(new URLSearchParams(raw)); }

  const emails: string[] = [], statuses: string[] = [], products: string[] = [], orders: string[] = [], values: number[] = [];
  walk(payload, (k, v) => {
    const key = k.toLowerCase();
    if (typeof v === "string" && /email/.test(key) && v.includes("@")) emails.push(v.trim().toLowerCase());
    if (typeof v === "string" && /(status|event|evento|type|situa)/.test(key)) statuses.push(v);
    if ((typeof v === "string" || typeof v === "number") && /(product|produto|offer|oferta)/.test(key)) products.push(String(v));
    if ((typeof v === "string" || typeof v === "number") && /(transaction|order|pedido|sale_id|venda|^id$|uuid)/.test(key)) orders.push(String(v));
    if (typeof v === "number" && /(amount|price|valor|value|total)/.test(key)) values.push(v);
  });
  const st = statuses.join(" ").toLowerCase();
  const refunded = /(refund|reembols|estorn|chargeback|cancel|recus|refus)/.test(st);
  const approved = !refunded && /(approv|aprovad|paid|pago|complete|conclu|confirm)/.test(st);
  const email = emails[0] || null;
  const value = values.length ? (values[0] > 10000 ? values[0] / 100 : values[0]) : null;
  const order = orders[0] || null;
  const { data: prods } = await admin.from("products").select("id,title,slug,b4you_product").not("b4you_product", "is", null);
  const norm = (x: string) => x.trim().toLowerCase();
  const product = (prods || []).find((p: any) => products.some((v) => norm(v) === norm(p.b4you_product) || norm(v).includes(norm(p.b4you_product))));
  const { data: ev } = await admin.from("b4_events").insert({ event: statuses.slice(0, 3).join(" · ") || null, email, product: products[0] || null, value, order_code: order, payload, status: "Recebido" }).select("id").single();
  const finish = async (status: string, note: string, creator_id?: string | null) => { await admin.from("b4_events").update({ status, note, creator_id: creator_id || null }).eq("id", ev!.id); return NextResponse.json({ ok: true, status }); };

  // Press kit pago na B4YOU
  const { data: kits } = await admin.from("press_kits").select("id,name,b4you_id,brand_id").not("b4you_id", "is", null);
  const kit = (kits || []).find((k: any) => products.some((p) => p === k.b4you_id));

  if (!product && !kit) return finish("Para revisar", "Produto não reconhecido: confira o “ID ou nome na B4YOU” no produto do Club Criadora ou no press kit.");
  if (!email) return finish("Para revisar", "O evento não trouxe e-mail.");
  const { data: crs } = await admin.from("creators").select("id,name").ilike("email", email).limit(1);
  let creator = crs?.[0];
  if (!creator) {
    const { data: pr } = await admin.from("profiles").select("creator_id").ilike("email", email).eq("role", "creator").limit(1);
    if (pr?.[0]?.creator_id) creator = { id: pr[0].creator_id, name: "" } as any;
  }
  if (!creator) return finish("Para revisar", `Nenhuma creator cadastrada com o e-mail ${email}.`);

  const notify = async (text: string, link: string) => {
    const { data: ps } = await admin.from("profiles").select("id").eq("creator_id", creator!.id).eq("role", "creator");
    if (ps?.length) await admin.from("notifications").insert(ps.map((p: any) => ({ user_id: p.id, text, link })));
  };

  if (kit) {
    const { data: o } = await admin.from("pk_orders").select("id").eq("pk_id", kit.id).eq("creator_id", creator.id).eq("status", "Aguardando pagamento").order("created_at", { ascending: false }).limit(1);
    if (!o?.length) return finish("Para revisar", "Pagamento de press kit sem pedido aguardando pagamento.", creator.id);
    if (!approved) return finish("Ignorado", "Evento de press kit sem pagamento aprovado.", creator.id);
    await admin.from("pk_orders").update({ status: "Preparando", payment: "Pago", order_code: order || undefined }).eq("id", o[0].id);
    await admin.from("shipments").insert({ creator_id: creator.id, brand_id: kit.brand_id, pk_order_id: o[0].id, product: kit.name, qty: 1, reason: "Compra de press kit confirmada", status: "Preparando", approved_at: new Date().toISOString() });
    await notify(`✅ Compra confirmada! Seu press kit ${kit.name} está sendo preparado.`, "/clube/presskits");
    return finish("Processado", `Press kit ${kit.name} pago.`, creator.id);
  }

  if (refunded) {
    await admin.from("method_purchases").update({ status: "Reembolsado" }).eq("creator_id", creator.id).eq("product_id", product!.id).eq("status", "Pago");
    return finish("Processado", `Reembolso/cancelamento: acesso a ${product!.title} retirado.`, creator.id);
  }
  if (!approved) return finish("Ignorado", "Evento sem pagamento aprovado (ex.: boleto gerado, pix pendente).", creator.id);

  const { data: pend } = await admin.from("method_purchases").select("id").eq("creator_id", creator.id).eq("product_id", product!.id).neq("status", "Pago").order("created_at", { ascending: false }).limit(1);
  const row = { product_id: product!.id, status: "Pago", source: "B4YOU (webhook)", order_code: order, value, email, paid_at: new Date().toISOString() };
  if (pend?.length) await admin.from("method_purchases").update(row).eq("id", pend[0].id);
  else await admin.from("method_purchases").insert({ creator_id: creator.id, ...row });
  if (value) await admin.from("sales").insert({ creator_id: creator.id, product: product!.title, sold: value, creator_pct: 0, conecta_pct: 100, rule: "Produto", status: "Aprovada", source: "B4YOU", external_id: order ? `b4-${order}` : null }).then(() => null, () => null);
  await notify(`🎉 Pagamento confirmado! Seu acesso a ${product!.title} foi liberado.`, `/club/${product!.slug}`);
  await admin.from("b4_events").update({ product_id: product!.id }).eq("id", ev!.id);
  return finish("Processado", `Acesso a ${product!.title} liberado.`, creator.id);
}
