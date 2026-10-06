"use client";
// Premiação do desafio: um prêmio por colocação (ou para todas que baterem a meta).
import { useState } from "react";
import { REWARD_TYPES } from "@/lib/consts";

export type Prize = { place: string; requirement: string; reward_type: string; reward_label: string; reward_value: string };
const placeName = (i: number) => `${i + 1}º lugar`;
const blank = (i: number): Prize => ({ place: placeName(i), requirement: "", reward_type: "Dinheiro", reward_label: "", reward_value: "" });

export default function PrizesEditor({ initial }: { initial?: Prize[] }) {
  const [rows, setRows] = useState<Prize[]>(initial?.length ? initial : [blank(0)]);
  const up = (i: number, p: Partial<Prize>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const preset = (n: number) => setRows(Array.from({ length: n }).map((_, i) => rows[i] && /º lugar$/.test(rows[i].place) ? { ...rows[i], place: placeName(i) } : blank(i)));
  const placed = rows.filter((r) => /º lugar$/.test(r.place)).length;
  return (
    <fieldset className="fs full prizes"><legend>Premiação</legend>
      <input type="hidden" name="prizes" value={JSON.stringify(rows)} />
      <div className="chips"><span className="small muted" style={{ alignSelf: "center" }}>Quantas ganhadoras?</span>
        {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={`chip ${placed === n && rows.length === n ? "on" : ""}`} onClick={() => preset(n)}>{n === 1 ? "1 ganhadora" : `${n} ganhadoras`}</button>)}
        <button type="button" className="chip" onClick={() => setRows([...rows, { ...blank(rows.length), place: "Todas que baterem a meta" }])}>+ Prêmio para todas que baterem a meta</button>
      </div>
      {rows.map((r, i) => (
        <div className="prize-row" key={i}>
          <div className="prize-h"><input className="input prize-place" value={r.place} onChange={(e) => up(i, { place: e.target.value })} aria-label="Colocação" />
            {rows.length > 1 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remover</button> : null}</div>
          <div className="form-grid">
            <div className="field full"><label>Requisitos para ganhar</label><input className="input" value={r.requirement} onChange={(e) => up(i, { requirement: e.target.value })} placeholder="Ex.: 100 vídeos e 70 vendas" /></div>
            <div className="field"><label>Tipo de prêmio</label><select className="input" value={r.reward_type} onChange={(e) => up(i, { reward_type: e.target.value })}>{REWARD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Valor (R$, opcional)</label><input className="input" type="text" inputMode="decimal" placeholder="0,00" value={r.reward_value} onChange={(e) => up(i, { reward_value: e.target.value })} /></div>
            <div className="field full"><label>Prêmio (o que ela ganha)</label><input className="input" value={r.reward_label} onChange={(e) => up(i, { reward_label: e.target.value })} placeholder="Ex.: R$ 1.000 no Pix, kit completo Anagrow, iPhone…" /></div>
          </div>
        </div>))}
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setRows([...rows, blank(placed)])}>+ Adicionar colocação</button>
    </fieldset>
  );
}
