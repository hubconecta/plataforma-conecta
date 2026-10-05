// Peças de etiquetas que rodam no servidor: filtro por etiqueta,
// etiquetas só para leitura e caixinhas para escolher ao criar um item.
import Link from "next/link";
import { textOn, type Label } from "@/lib/label-ui";

export function LabelChips({ labels, small }: { labels: Label[]; small?: boolean }) {
  if (!labels.length) return null;
  return <span className={`lbl-row ${small ? "compact" : ""}`}>{labels.map((l) => <span key={l.id} className={`lbl ${small ? "sm" : ""}`} style={{ background: l.color, color: textOn(l.color) }} title={l.name}>{l.name}</span>)}</span>;
}

// Faixa "Filtrar por etiqueta". base = endereço atual sem o ?et=
export function LabelFilter({ labels, active, base }: { labels: Label[]; active?: string; base: string }) {
  if (!labels.length) return <div className="chips"><Link className="chip" href="/etiquetas">🏷 Criar etiquetas</Link></div>;
  const href = (id?: string) => (id ? `${base}${base.includes("?") ? "&" : "?"}et=${id}` : base);
  return (
    <div className="chips lbl-filter" aria-label="Filtrar por etiqueta">
      <span className="small muted" style={{ alignSelf: "center" }}>🏷</span>
      <Link className={`chip ${!active ? "on" : ""}`} href={href()}>Todas</Link>
      {labels.map((l) => <Link key={l.id} className={`chip ${active === l.id ? "on" : ""}`} href={href(active === l.id ? undefined : l.id)}><i className="lbl-dot" style={{ background: l.color }} />{l.name}</Link>)}
      <Link className="chip" href="/etiquetas" title="Gerenciar etiquetas">⚙︎</Link>
    </div>
  );
}

// Para formulários de criação (tarefa, compromisso): marca as etiquetas já ao criar.
export function LabelChecks({ labels, on = [] }: { labels: Label[]; on?: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="field full"><label>Etiquetas</label>
      <div className="lbl-checks">{labels.map((l) => <label key={l.id} className="lbl-ck"><input type="checkbox" name="label_ids" value={l.id} defaultChecked={on.includes(l.id)} /><span className="lbl" style={{ background: l.color, color: textOn(l.color) }}>{l.name}</span></label>)}</div>
    </div>
  );
}
