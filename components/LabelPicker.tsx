"use client";
// Seletor de etiquetas estilo Trello: mostra as etiquetas do item e abre
// uma janelinha para marcar/desmarcar, buscar e criar etiquetas novas.
import { useEffect, useMemo, useState, useTransition } from "react";
import { setLabel, createLabel } from "@/app/(app)/etiquetas/actions";
import { ENT, LABEL_COLORS, textOn, fitsScope, type Entity, type Label } from "@/lib/label-ui";

export function LabelChip({ l, small }: { l: Label; small?: boolean }) {
  return <span className={`etq ${small ? "sm" : ""}`} style={{ background: l.color, color: textOn(l.color) }} title={l.name}>{l.name}</span>;
}

export default function LabelPicker({ all, on, entity, id, compact }: { all: Label[]; on: string[]; entity: Entity; id: string; compact?: boolean }) {
  const [labels, setLabels] = useState<Label[]>(all);
  const [sel, setSel] = useState<string[]>(on);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0][0]);
  const [onlyHere, setOnlyHere] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => setSel(on), [on.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLabels(all), [all.map((l) => l.id + l.name + l.color).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const usable = useMemo(() => labels.filter((l) => fitsScope(l, entity)), [labels, entity]);
  const shown = usable.filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase()));
  const mine = usable.filter((l) => sel.includes(l.id));

  const toggle = (l: Label) => {
    const turnOn = !sel.includes(l.id);
    setErr("");
    setSel((s) => (turnOn ? [...s, l.id] : s.filter((x) => x !== l.id)));
    start(async () => {
      const r = await setLabel(entity, id, l.id, turnOn);
      if (!r.ok) { setErr(r.error || "Erro"); setSel((s) => (turnOn ? s.filter((x) => x !== l.id) : [...s, l.id])); }
    });
  };
  const create = () => {
    const n = name.trim();
    if (!n) return setErr("Dê um nome à etiqueta.");
    setErr("");
    start(async () => {
      const r = await createLabel(n, color, onlyHere ? ENT[entity].scope : "Todas", { entity, id });
      if (!r.ok || !r.label) return setErr(r.error || "Erro");
      setLabels((ls) => [...ls, r.label!]);
      setSel((s) => [...s, r.label!.id]);
      setName(""); setCreating(false); setQ("");
    });
  };

  return (
    <div className={`lbl-row ${compact ? "compact" : ""}`}>
      {mine.map((l) => <LabelChip key={l.id} l={l} small={compact} />)}
      <button type="button" className="lbl-add" onClick={() => setOpen(true)} aria-label="Etiquetas">{mine.length ? "＋" : "＋ Etiqueta"}</button>
      {open ? (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal lbl-modal" role="dialog" aria-label="Etiquetas" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h"><div><b>Etiquetas</b><span className="small muted">Toque para colocar ou tirar desta {ENT[entity].nome}</span></div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Fechar">✕</button></div>
            <div className="modal-b">
              {!creating ? (<>
                <input className="input" placeholder="Buscar etiquetas…" value={q} onChange={(e) => setQ(e.target.value)} />
                <div className="lbl-list">
                  {shown.map((l) => { const on = sel.includes(l.id); return (
                    <button type="button" key={l.id} className={`lbl-opt ${on ? "on" : ""}`} onClick={() => toggle(l)} aria-pressed={on}>
                      <span className="lbl-check">{on ? "✓" : ""}</span>
                      <span className="lbl-bar" style={{ background: l.color, color: textOn(l.color) }}>{l.name}</span>
                    </button>); })}
                  {!shown.length ? <p className="small muted">{q ? "Nenhuma etiqueta com esse nome." : "Nenhuma etiqueta ainda."}</p> : null}
                </div>
                <button type="button" className="btn btn-dark btn-sm" onClick={() => { setCreating(true); setName(q); }}>＋ Criar nova etiqueta</button>
                <a className="small" href="/etiquetas">Gerenciar etiquetas (renomear, mudar cor, excluir)</a>
              </>) : (<>
                <div className="lbl-preview"><span className="lbl-bar" style={{ background: color, color: textOn(color) }}>{name || "Nome da etiqueta"}</span></div>
                <div className="field"><label>Nome</label><input className="input" autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())} placeholder="Ex.: Urgente, VIP, Reunião…" /></div>
                <div className="field"><label>Cor</label><div className="lbl-colors">{LABEL_COLORS.map(([c, n]) => <button type="button" key={c} className={`lbl-sw ${color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={n} title={n} />)}</div></div>
                <label className="perm"><input type="checkbox" checked={onlyHere} onChange={(e) => setOnlyHere(e.target.checked)} />Usar só em {ENT[entity].scope} (senão aparece em tudo)</label>
                <div className="actions" style={{ justifyContent: "flex-start" }}><button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={create}>Criar e colocar</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Voltar</button></div>
              </>)}
              {err ? <p className="small" style={{ color: "var(--bad)" }}>{err}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
