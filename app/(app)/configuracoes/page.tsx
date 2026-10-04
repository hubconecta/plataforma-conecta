import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Notice } from "@/components/ui";
import { saveConfig } from "./actions";

export default async function Configuracoes({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("config");
  const { data } = await supabase.from("settings").select("key,value").in("key", ["whatsapp", "lead_qs"]);
  const S = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
  const wa = S.whatsapp || {}, lq = S.lead_qs || {};
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
      <div className="card"><div className="card-h"><h2>Outras configurações</h2></div><div className="list">
        <div className="li"><div className="grow"><b>Checkout do Método e integração B4YOU</b><span>Link do botão QUERO ACESSAR e webhook</span></div><Link className="btn btn-ghost btn-sm" href="/metodo/admin?tab=vendas">Abrir</Link></div>
        <div className="li"><div className="grow"><b>Lembretes automáticos de pagamento</b><span>Antes, no dia e depois do vencimento</span></div><Link className="btn btn-ghost btn-sm" href="/financeiro?tab=cobrancas">Abrir</Link></div>
      </div></div>
    </>
  );
}
