import { CH_TYPES, CH_AUDIENCE, REWARD_TYPES } from "@/lib/consts";
import { saveChallenge } from "./actions";

// Mesmo formulário para a equipe (cria/edita) e para a marca (propõe para aprovação).
export default function ChallengeForm({ c, brands, campaigns, isBrand }: { c?: any; brands: any[]; campaigns: any[]; isBrand: boolean }) {
  const F = ({ n, l, t = "text", full, req }: { n: string; l: string; t?: string; full?: boolean; req?: boolean }) => (
    <div className={`field ${full ? "full" : ""}`}><label htmlFor={`ch_${n}`}>{l}</label><input className="input" id={`ch_${n}`} name={n} type={t} required={req} defaultValue={c?.[n] ?? ""} step={t === "number" ? "any" : undefined} /></div>
  );
  const T = ({ n, l }: { n: string; l: string }) => <div className="field full"><label htmlFor={`ch_${n}`}>{l}</label><textarea className="input" id={`ch_${n}`} name={n} defaultValue={c?.[n] ?? ""} /></div>;
  return (
    <form action={saveChallenge} className="form-grid">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <F n="name" l="Nome do desafio" req full />
      <div className="field"><label htmlFor="ch_type">Tipo</label><select className="input" id="ch_type" name="type" defaultValue={c?.type || "Conteúdo"}>{CH_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      {isBrand ? null : <div className="field"><label htmlFor="ch_brand">Marca</label><select className="input" id="ch_brand" name="brand_id" defaultValue={c?.brand_id || ""}><option value="">Clube Conecta (sem marca)</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
      <div className="field"><label htmlFor="ch_camp">Campanha (opcional)</label><select className="input" id="ch_camp" name="campaign_id" defaultValue={c?.campaign_id || ""}><option value="">Sem campanha</option>{campaigns.map((x) => <option key={x.id} value={x.id}>{x.name}{x.brands?.name && !isBrand ? ` · ${x.brands.name}` : ""}</option>)}</select></div>
      <div className="field"><label htmlFor="ch_aud">Público</label><select className="input" id="ch_aud" name="audience" defaultValue={c?.audience || "Todas as creators"}>{CH_AUDIENCE.map((t) => <option key={t}>{t}</option>)}</select><span className="small muted">“Creators da base da marca”: só quem entrou pela marca escolhida vê e recebe o aviso.</span></div>
      {!c && !isBrand ? <div className="field"><label htmlFor="ch_st">Status inicial</label><select className="input" id="ch_st" name="status" defaultValue="Rascunho">{["Rascunho", "Agendado", "Ativo"].map((t) => <option key={t}>{t}</option>)}</select></div> : null}
      <F n="start_date" l="Início" t="date" /><F n="due_date" l="Prazo final" t="date" />
      <F n="target" l="Meta (quantidade a cumprir)" t="number" /><F n="points" l="Pontos" t="number" />
      <F n="winners" l="Vencedoras (0 = todas que cumprirem)" t="number" />
      <div className="field"><label htmlFor="ch_rt">Tipo de recompensa</label><select className="input" id="ch_rt" name="reward_type" defaultValue={c?.reward_type || "Produto"}>{REWARD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      <F n="reward_label" l="Recompensa (descrição)" /><F n="reward_value" l="Valor da recompensa (R$, opcional)" t="number" />
      <T n="description" l="Descrição" /><T n="objective" l="Objetivo" /><T n="rules" l="Regras" /><T n="criteria" l="Critérios de avaliação" />
      <T n="evidence" l="Comprovante exigido (o que a creator precisa enviar)" /><T n="regulation" l="Regulamento" />
      <div><button className="btn btn-primary btn-sm">{isBrand ? (c ? "Salvar e reenviar para aprovação" : "Enviar para aprovação da Conecta") : c ? "Salvar desafio" : "Criar desafio"}</button></div>
    </form>
  );
}
