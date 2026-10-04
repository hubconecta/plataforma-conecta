import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Notice } from "@/components/ui";
import { saveConfig } from "./actions";
import { saveCommunityLink, deleteCommunityLink } from "../perfil/actions";
import ConfirmDelete from "@/components/ConfirmDelete";

export default async function Configuracoes({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("config");
  const { data } = await supabase.from("settings").select("key,value").in("key", ["whatsapp", "lead_qs"]);
  const S = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
  const wa = S.whatsapp || {}, lq = S.lead_qs || {};
  const { data: groups } = await supabase.from("community_links").select("*").order("position").order("created_at");
  return (
    <>
      <PageH eyebrow="Sistema" title="Configurações" sub="Ajustes gerais da plataforma." />
      <Notice q={q} />
      <form action={saveConfig} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset className="fs"><legend>Botão de WhatsApp</legend><p className="small muted">Aparece flutuando no Portal da Marca, no Clube e nas páginas públicas. Deixe vazio para esconder.</p><div className="form-grid">
          <div className="field"><label htmlFor="cf_wa">Número com DDD (só números, com 55)</label><input className="input" id="cf_wa" name="whatsapp" defaultValue={wa.number || ""} placeholder="5511999999999" /></div>
          <div className="field"><label htmlFor="cf_wm">Mensagem inicial</label><input className="input" id="cf_wm" name="wa_message" defaultValue={wa.message || "Olá, Conecta! Vim pela plataforma."} /></div></div></fieldset>
        <fieldset className="fs"><legend>Formulário de leads (Para Marcas) · perguntas de orçamento</legend><div className="perm-grid">
          {[["hasBudget", "Já possui orçamento?"], ["amount", "Quanto pretende investir?"], ["creators", "Já trabalha com creators?"], ["affiliates", "Tem programa de afiliados?"], ["agency", "Já trabalhou com agência?"]].map(([k, l]) => <label key={k} className="perm"><input type="checkbox" name={k} defaultChecked={lq[k] !== false} />{l}</label>)}
        </div></fieldset>
        <div><button className="btn btn-primary">Salvar configurações</button></div>
      </form>
      <div className="card"><div className="card-h"><h2>Grupos de WhatsApp da comunidade</h2><span className="small muted">aparecem no início de quem tem acesso</span></div>
        {groups?.length ? <div className="list">{groups.map((g: any) => <div className="li" key={g.id}><div className="grow"><b>{g.title}</b><span>{g.audience} · {g.url}</span></div><ConfirmDelete action={deleteCommunityLink} fields={{ id: g.id, back: "/configuracoes" }} label="Remover" warning="O grupo deixa de aparecer na plataforma (o grupo no WhatsApp continua existindo)." /></div>)}</div> : <p className="muted small">Nenhum grupo cadastrado.</p>}
        <form action={saveCommunityLink} className="form-grid" style={{ marginTop: 10 }}><input type="hidden" name="back" value="/configuracoes" />
          <div className="field"><label>Nome do grupo</label><input className="input" name="title" required placeholder="Comunidade Conecta" /></div>
          <div className="field"><label>Quem vê</label><select className="input" name="audience">{["Creators", "Marcas", "Todos", "Equipe"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field full"><label>Link do grupo</label><input className="input" name="url" type="url" required placeholder="https://chat.whatsapp.com/…" /></div>
          <div><button className="btn btn-dark btn-sm">Adicionar grupo</button></div></form>
        <p className="small muted" style={{ marginTop: 8 }}>O grupo de cada campanha é colocado na própria campanha: só as creators aprovadas e a marca veem.</p></div>
      <div className="card"><div className="card-h"><h2>Outras configurações</h2></div><div className="list">
        <div className="li"><div className="grow"><b>Club Criadora e integração B4YOU</b><span>Produtos, links de checkout e webhook</span></div><Link className="btn btn-ghost btn-sm" href="/club/admin">Abrir</Link></div>
        <div className="li"><div className="grow"><b>Lembretes automáticos de pagamento</b><span>Antes, no dia e depois do vencimento</span></div><Link className="btn btn-ghost btn-sm" href="/financeiro?tab=cobrancas">Abrir</Link></div>
      </div></div>
    </>
  );
}
