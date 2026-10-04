// Leitura dos avisos da B4YOU e liberação automática do acesso.
// Como a B4YOU não publica o formato exato, a leitura é tolerante: procura o e-mail, o status
// e o produto em qualquer parte do aviso. O ID cadastrado no produto é comparado com TODOS os
// valores recebidos (ex.: product.id, offer.uuid, items[0].product_id, nome do produto…).

type Leaf = { path: string; key: string; value: string | number };

function leaves(o: any, path = "", out: Leaf[] = [], depth = 0): Leaf[] {
  if (!o || typeof o !== "object" || depth > 8) return out;
  for (const [k, v] of Object.entries(o)) {
    const p = path ? `${path}.${k}` : k;
    if (v && typeof v === "object") leaves(v, p, out, depth + 1);
    else if (typeof v === "string" || typeof v === "number") out.push({ path: p.toLowerCase(), key: k.toLowerCase(), value: v });
  }
  return out;
}

const norm = (x: any) => String(x ?? "").trim().toLowerCase();

export function readB4(payload: any) {
  const L = leaves(payload);
  const emails = L.filter((l) => /e-?mail/.test(l.key) && String(l.value).includes("@")).map((l) => norm(l.value));
  const buyer = L.find((l) => /(customer|client|buyer|comprador|cliente|student|aluno)/.test(l.path) && /e-?mail/.test(l.key) && String(l.value).includes("@"));
  const statuses = L.filter((l) => /(status|event|evento|situa|state|type|tipo)$/.test(l.key) || /(^|\.)(status|event)(\.|$)/.test(l.path)).map((l) => String(l.value));
  const prodVals = L.filter((l) => /(product|produto|offer|oferta|item|plan|plano|course|curso)/.test(l.path)).map((l) => String(l.value));
  const orders = L.filter((l) => /(transaction|order|pedido|sale|venda|invoice|fatura)/.test(l.path) && /(id|uuid|code|codigo|number|numero)$/.test(l.key)).map((l) => String(l.value));
  const amounts = L.filter((l) => /(amount|price|valor|value|total|paid)/.test(l.key) && !isNaN(Number(l.value)) && Number(l.value) > 0).map((l) => Number(l.value));
  const st = statuses.join(" ").toLowerCase();
  const pending = /(waiting|pending|aguard|pendente|unpaid|expired|expirad|generated|gerad|created|criad|abandon)/.test(st);
  const refunded = /(refund|reembols|estorn|chargeback|cancel|recus|refus|denied|negad)/.test(st);
  const approved = !refunded && /(approv|aprovad|\bpaid\b|_paid|paid_|\bpago\b|complete|conclu|confirm|success|sucesso|liberad)/.test(st) && !(pending && !/(approv|aprovad)/.test(st));
  const raw = amounts[0] ?? null;
  return {
    all: L.map((l) => norm(l.value)),
    prodVals: prodVals.map(norm),
    email: buyer ? norm(buyer.value) : emails[0] || null,
    statuses, approved, refunded,
    order: orders[0] || null,
    value: raw == null ? null : Number.isInteger(raw) && raw > 1000 ? raw / 100 : raw,
    productLabel: prodVals.find((v) => isNaN(Number(v)) && v.length > 3) || prodVals[0] || null,
  };
}

// O ID/nome cadastrado bate com algum valor do aviso?
export function matches(info: ReturnType<typeof readB4>, configured?: string | null) {
  const want = norm(configured);
  if (!want) return false;
  if (info.prodVals.includes(want)) return true; // ID exato dentro do produto/oferta
  if (want.length >= 6 && info.all.includes(want)) return true; // ID longo em qualquer lugar do aviso
  return want.length >= 4 && info.prodVals.some((v) => v === want || v.includes(want) || (v.length >= 6 && want.includes(v)));
}

export async function processB4Event(admin: any, eventId: string) {
  const { data: ev } = await admin.from("b4_events").select("*").eq("id", eventId).single();
  if (!ev) return "erro";
  const info = readB4(ev.payload);
  const finish = async (status: string, note: string, extra: any = {}) => { await admin.from("b4_events").update({ status, note, email: info.email, value: info.value, order_code: info.order, event: info.statuses.slice(0, 3).join(" · ") || null, product: info.productLabel, ...extra }).eq("id", eventId); return status; };

  const [{ data: prods }, { data: kits }] = await Promise.all([
    admin.from("products").select("id,title,slug,b4you_product").not("b4you_product", "is", null),
    admin.from("press_kits").select("id,name,b4you_id,brand_id").not("b4you_id", "is", null),
  ]);
  const product = (prods || []).find((p: any) => matches(info, p.b4you_product));
  const kit = product ? null : (kits || []).find((k: any) => matches(info, k.b4you_id));
  if (!product && !kit) return finish("Para revisar", `Produto não reconhecido. Valores de produto recebidos: ${[...new Set(info.prodVals)].slice(0, 8).join(", ") || "nenhum"}. Copie o ID certo para o campo “ID ou nome na B4YOU” do produto e clique em Reprocessar.`);
  if (!info.email) return finish("Para revisar", "O aviso não trouxe e-mail do comprador.", { product_id: product?.id || null });

  let creator: any = null;
  const { data: crs } = await admin.from("creators").select("id,name").ilike("email", info.email).limit(1);
  creator = crs?.[0] || null;
  if (!creator) { const { data: pr } = await admin.from("profiles").select("creator_id,name").ilike("email", info.email).eq("role", "creator").limit(1); if (pr?.[0]?.creator_id) creator = { id: pr[0].creator_id, name: pr[0].name }; }
  if (!creator && product) { const { data: mp } = await admin.from("method_purchases").select("creator_id").eq("product_id", product.id).ilike("email", info.email).limit(1); if (mp?.[0]) creator = { id: mp[0].creator_id, name: "" }; }
  if (!creator) return finish("Para revisar", `Nenhuma creator cadastrada com o e-mail ${info.email}. Escolha a creator abaixo para liberar.`, { product_id: product?.id || null });

  const notifyTeam = async (text: string, link: string, mod: string) => {
    const { data: st } = await admin.from("profiles").select("id,role,perms").eq("status", "ativo").in("role", ["ceo", "equipe"]);
    const ids = (st || []).filter((p: any) => p.role === "ceo" || (p.perms || []).includes(mod)).map((p: any) => p.id);
    if (ids.length) await admin.from("notifications").insert(ids.map((id: string) => ({ user_id: id, text, link })));
  };
  const notify = async (text: string, link: string) => {
    const { data: ps } = await admin.from("profiles").select("id").eq("creator_id", creator.id).eq("role", "creator");
    if (ps?.length) await admin.from("notifications").insert(ps.map((p: any) => ({ user_id: p.id, text, link })));
  };
  const who = creator.name || info.email;

  if (kit) {
    if (!info.approved) return finish("Ignorado", `Aviso de press kit sem pagamento aprovado (${info.statuses.join(", ") || "sem status"}).`, { creator_id: creator.id });
    const { data: o } = await admin.from("pk_orders").select("id").eq("pk_id", kit.id).eq("creator_id", creator.id).in("status", ["Aguardando pagamento", "Disponível", "Comprado"]).order("created_at", { ascending: false }).limit(1);
    let orderId = o?.[0]?.id;
    if (orderId) await admin.from("pk_orders").update({ status: "Preparando", payment: "Pago", order_code: info.order || undefined, value: info.value || undefined }).eq("id", orderId);
    else { const { data: no } = await admin.from("pk_orders").insert({ creator_id: creator.id, pk_id: kit.id, status: "Preparando", payment: "Pago", value: info.value, order_code: info.order }).select("id").single(); orderId = no?.id; }
    await admin.from("shipments").insert({ creator_id: creator.id, brand_id: kit.brand_id, pk_order_id: orderId, product: kit.name, qty: 1, reason: "Compra de press kit confirmada", status: "Preparando", approved_at: new Date().toISOString() });
    await notify(`✅ Compra confirmada! Seu press kit ${kit.name} está sendo preparado.`, "/clube/presskits");
    await notifyTeam(`💰 Press kit vendido: ${who} comprou ${kit.name}`, "/presskits?tab=pedidos", "presskits");
    if (kit.brand_id) { const { data: bp } = await admin.from("profiles").select("id").eq("brand_id", kit.brand_id).eq("role", "marca").eq("status", "ativo"); if (bp?.length) await admin.from("notifications").insert(bp.map((p: any) => ({ user_id: p.id, text: `Nova compra de Press Kit: ${kit.name}. Pagamento confirmado; o envio está sendo preparado.`, link: "/portal/envios" }))); }
    return finish("Processado", `Press kit ${kit.name} pago por ${who}.`, { creator_id: creator.id });
  }

  if (info.refunded) {
    await admin.from("method_purchases").update({ status: "Reembolsado" }).eq("creator_id", creator.id).eq("product_id", product.id).eq("status", "Pago");
    await notifyTeam(`↩️ Reembolso/cancelamento: ${who} · ${product.title}`, `/club/admin/${product.id}?tab=alunas`, "metodo_adm");
    return finish("Processado", `Reembolso/cancelamento: acesso a ${product.title} retirado.`, { creator_id: creator.id, product_id: product.id });
  }
  if (!info.approved) return finish("Ignorado", `Aviso sem pagamento aprovado (${info.statuses.join(", ") || "sem status"}). O acesso é liberado no aviso de pagamento aprovado.`, { creator_id: creator.id, product_id: product.id });

  const { data: already } = await admin.from("method_purchases").select("id").eq("creator_id", creator.id).eq("product_id", product.id).eq("status", "Pago").limit(1);
  if (already?.length) return finish("Processado", `${who} já tinha acesso a ${product.title}.`, { creator_id: creator.id, product_id: product.id });
  const { data: pend } = await admin.from("method_purchases").select("id").eq("creator_id", creator.id).eq("product_id", product.id).neq("status", "Pago").order("created_at", { ascending: false }).limit(1);
  const row = { product_id: product.id, status: "Pago", source: "B4YOU (webhook)", order_code: info.order, value: info.value, email: info.email, paid_at: new Date().toISOString() };
  if (pend?.length) await admin.from("method_purchases").update(row).eq("id", pend[0].id);
  else await admin.from("method_purchases").insert({ creator_id: creator.id, ...row });
  if (info.value) await admin.from("sales").insert({ creator_id: creator.id, product: product.title, sold: info.value, creator_pct: 0, conecta_pct: 100, rule: "Produto", status: "Aprovada", source: "B4YOU", external_id: info.order ? `b4-${info.order}` : null }).then(() => null, () => null);
  await notify(`🎉 Pagamento confirmado! Seu acesso a ${product.title} foi liberado.`, `/club/${product.slug}`);
  await notifyTeam(`💰 Nova venda: ${who} comprou ${product.title}${info.value ? ` (R$ ${Number(info.value).toLocaleString("pt-BR")})` : ""}`, `/club/admin/${product.id}?tab=alunas`, "metodo_adm");
  return finish("Processado", `Acesso a ${product.title} liberado automaticamente para ${who}.`, { creator_id: creator.id, product_id: product.id });
}
