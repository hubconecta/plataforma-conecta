// Contratos das campanhas: modelo, preenchimento automático e envio para a creator aprovada.
export const CONTRACT_VARS: [string, string][] = [
  ["{{creator_nome}}", "nome da creator"], ["{{creator_instagram}}", "Instagram"], ["{{creator_cidade}}", "cidade/UF"],
  ["{{marca}}", "nome da marca"], ["{{campanha}}", "nome da campanha"], ["{{entregaveis}}", "entregáveis"],
  ["{{periodo}}", "início e fim"], ["{{cache}}", "cachê"], ["{{comissao}}", "comissão"], ["{{data}}", "data de hoje"],
];

export const CONTRACT_TEMPLATE = `CONTRATO DE PARTICIPAÇÃO EM CAMPANHA E AUTORIZAÇÃO DE USO DE IMAGEM

Pelo presente instrumento, {{creator_nome}} ({{creator_instagram}}), residente em {{creator_cidade}}, doravante CREATOR, e {{marca}}, doravante MARCA, com intermediação da CONECTA, ajustam a participação da CREATOR na campanha "{{campanha}}", nas condições abaixo.

1. OBJETO
A CREATOR produzirá e publicará os conteúdos descritos a seguir: {{entregaveis}}.

2. PERÍODO
A campanha acontece no período de {{periodo}}.

3. REMUNERAÇÃO
Cachê: {{cache}}. Comissão sobre vendas: {{comissao}}. Quando houver, o pagamento segue o combinado na campanha.

4. AUTORIZAÇÃO DE USO DE IMAGEM E VOZ
A CREATOR autoriza a MARCA a usar sua imagem, nome, voz e os conteúdos produzidos para esta campanha em suas redes sociais, site, anúncios pagos e materiais de divulgação, pelo prazo de 12 (doze) meses a contar da assinatura, no território nacional, sem custo adicional além do previsto neste contrato.

5. OBRIGAÇÕES DA CREATOR
Seguir o briefing da campanha, cumprir os prazos, sinalizar a publicidade conforme as regras do CONAR (#publi / parceria paga) e não publicar conteúdo que prejudique a imagem da MARCA.

6. OBRIGAÇÕES DA MARCA
Fornecer o briefing e os produtos necessários, aprovar os conteúdos em tempo hábil e efetuar os pagamentos combinados.

7. CONFIDENCIALIDADE
As partes manterão em sigilo as informações comerciais da campanha.

8. ASSINATURA ELETRÔNICA
As partes concordam que este contrato seja assinado eletronicamente na plataforma Conecta, com registro de nome, documento, data, hora, IP e aparelho de cada parte.

{{data}}`;

const brl = (n: any) => (Number(n) ? Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "a combinar");
const dbr = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "a definir");

export function fillContract(body: string, v: { creator?: any; brand?: any; campaign?: any }) {
  const c = v.creator || {}, b = v.brand || {}, k = v.campaign || {};
  const today = new Date(Date.now() - 3 * 3600e3).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  const map: Record<string, string> = {
    "{{creator_nome}}": c.name || "", "{{creator_instagram}}": c.instagram || "—", "{{creator_cidade}}": c.city ? `${c.city}/${c.state || ""}` : "—",
    "{{marca}}": b.razao_social ? `${b.name} (${b.razao_social}${b.cnpj ? `, CNPJ ${b.cnpj}` : ""})` : b.name || "", "{{campanha}}": k.name || "",
    "{{entregaveis}}": k.deliverables || (k.contents_per_creator ? `${k.contents_per_creator} conteúdo(s)` : "conforme o briefing da campanha"),
    "{{periodo}}": `${dbr(k.start_date)} a ${dbr(k.end_date)}`, "{{cache}}": brl(k.fee), "{{comissao}}": k.commission_pct ? `${k.commission_pct}%` : "não se aplica", "{{data}}": today,
  };
  return Object.entries(map).reduce((t, [a, r]) => t.split(a).join(r), body);
}

// Cria o contrato da creator (se a campanha tiver contrato ativo) e avisa por notificação.
export async function sendContract(admin: any, campaignId: string, creatorId: string) {
  const { data: tpl } = await admin.from("campaign_contracts").select("*").eq("campaign_id", campaignId).eq("active", true).maybeSingle();
  if (!tpl) return false;
  const { data: ex } = await admin.from("contract_signatures").select("id,status").eq("campaign_id", campaignId).eq("creator_id", creatorId).maybeSingle();
  if (ex && ex.status !== "Cancelado") return false;
  const [{ data: campaign }, { data: creator }] = await Promise.all([
    admin.from("campaigns").select("*").eq("id", campaignId).single(),
    admin.from("creators").select("name,instagram,city,state").eq("id", creatorId).single(),
  ]);
  const { data: brand } = await admin.from("brands").select("name,razao_social,cnpj").eq("id", campaign?.brand_id).maybeSingle();
  const row = { campaign_id: campaignId, creator_id: creatorId, title: tpl.title, body: fillContract(tpl.body, { creator, brand, campaign }), status: "Aguardando creator", creator_name: null, creator_doc: null, creator_signed_at: null, brand_signer: null, brand_signed_at: null };
  const { data: sig } = ex ? await admin.from("contract_signatures").update(row).eq("id", ex.id).select("id").single() : await admin.from("contract_signatures").insert(row).select("id").single();
  if (!sig) return false;
  const { data: ps } = await admin.from("profiles").select("id").eq("creator_id", creatorId).eq("role", "creator").eq("status", "ativo");
  if (ps?.length) await admin.from("notifications").insert(ps.map((p: any) => ({ user_id: p.id, text: `📄 Contrato da campanha ${campaign?.name || ""} para você ler e assinar`, link: `/contrato/${sig.id}` })));
  return true;
}
