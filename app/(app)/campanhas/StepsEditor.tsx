"use client";
// Próximos passos que a creator recebe quando é aprovada (em ordem).
import { useState } from "react";

type Step = { title: string; url: string; description: string };
const SUGG: Step[] = [
  { title: "Cadastre-se como afiliada da marca", url: "", description: "Faça seu cadastro no programa de afiliadas para receber seu link/cupom." },
  { title: "Entre no grupo da campanha no WhatsApp", url: "", description: "" },
  { title: "Preencha o formulário de envio", url: "", description: "" },
];

export default function StepsEditor({ initial }: { initial?: Step[] }) {
  const [rows, setRows] = useState<Step[]>(initial || []);
  const up = (i: number, p: Partial<Step>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= rows.length) return; const a = [...rows]; [a[i], a[j]] = [a[j], a[i]]; setRows(a); };
  return (
    <fieldset className="fs full prizes"><legend>Próximos passos das aprovadas</legend>
      <input type="hidden" name="steps" value={JSON.stringify(rows)} />
      <p className="small muted">Quando a creator é aprovada, ela recebe estes passos em ordem, com os botões. Ex.: 1) cadastrar como afiliada pelo link da marca, 2) entrar no grupo. Só as aprovadas e a marca veem.</p>
      {rows.map((r, i) => (
        <div className="prize-row" key={i}>
          <div className="prize-h"><b>{i + 1}º passo</b><span style={{ flex: 1 }} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label="Subir">↑</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} aria-label="Descer">↓</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remover</button></div>
          <div className="form-grid">
            <div className="field"><label>Título do passo</label><input className="input" value={r.title} onChange={(e) => up(i, { title: e.target.value })} placeholder="Ex.: Cadastre-se como afiliada" /></div>
            <div className="field"><label>Link (opcional)</label><input className="input" type="url" value={r.url} onChange={(e) => up(i, { url: e.target.value })} placeholder="https://…" /></div>
            <div className="field full"><label>Explicação (opcional)</label><input className="input" value={r.description} onChange={(e) => up(i, { description: e.target.value })} /></div>
          </div>
        </div>))}
      <div className="chips">
        <button type="button" className="chip" onClick={() => setRows([...rows, { title: "", url: "", description: "" }])}>+ Adicionar passo</button>
        {SUGG.filter((x) => !rows.some((r) => r.title === x.title)).map((x) => <button type="button" key={x.title} className="chip" onClick={() => setRows([...rows, x])}>+ {x.title}</button>)}
      </div>
    </fieldset>
  );
}
