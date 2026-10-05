import { requireModule } from "@/lib/session";
import { PageH, Notice } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { LABEL_COLORS, SCOPES, textOn } from "@/lib/label-ui";
import { saveLabelForm, deleteLabelForm } from "./actions";

const ENT_NAME: Record<string, string> = { marca: "marcas", creator: "creators", form: "formulários", task: "tarefas", event: "compromissos" };

function ColorPick({ cur }: { cur?: string }) {
  const c0 = cur || LABEL_COLORS[0][0];
  return (
    <div className="field full"><label>Cor</label><div className="lbl-colors">
      {LABEL_COLORS.map(([c, n]) => <label key={c} title={n} style={{ position: "relative" }}><input type="radio" name="color" value={c} defaultChecked={c === c0} style={{ position: "absolute", opacity: 0 }} /><span className="lbl-sw" style={{ background: c, display: "block" }} /></label>)}
      {!LABEL_COLORS.some(([c]) => c === c0) ? <label style={{ position: "relative" }}><input type="radio" name="color" value={c0} defaultChecked style={{ position: "absolute", opacity: 0 }} /><span className="lbl-sw" style={{ background: c0, display: "block" }} /></label> : null}
    </div></div>
  );
}

export default async function Etiquetas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("etiquetas");
  const [{ data: labels }, { data: links }] = await Promise.all([
    supabase.from("labels").select("*").order("position").order("name"),
    supabase.from("label_links").select("label_id,entity"),
  ]);
  const uses = (id: string) => {
    const c: Record<string, number> = {};
    (links || []).filter((l: any) => l.label_id === id).forEach((l: any) => (c[l.entity] = (c[l.entity] || 0) + 1));
    return Object.entries(c).map(([e, n]) => `${n} ${ENT_NAME[e] || e}`).join(" · ") || "ainda não usada";
  };
  const Fields = ({ l }: { l?: any }) => (<>
    <div className="field"><label>Nome</label><input className="input" name="name" required maxLength={40} defaultValue={l?.name || ""} placeholder="Ex.: Urgente, VIP, Reunião" /></div>
    <div className="field"><label>Onde aparece</label><select className="input" name="scope" defaultValue={l?.scope || "Todas"}>{SCOPES.map((s) => <option key={s} value={s}>{s === "Todas" ? "Em tudo" : `Só em ${s}`}</option>)}</select></div>
    <ColorPick cur={l?.color} />
    <div className="field"><label>Ordem</label><input className="input" type="number" name="position" defaultValue={l?.position ?? 0} /></div>
  </>);
  return (
    <>
      <PageH eyebrow="Gestão" title="Etiquetas" sub="Crie etiquetas com nome e cor, como no Trello, e use em marcas, creators, formulários, tarefas e no calendário. Só a equipe Conecta vê." />
      <style>{`.lbl-colors input:checked + .lbl-sw{outline:2.5px solid var(--ink);outline-offset:2px}`}</style>
      <Notice q={q} />
      <details className="mod" open={!labels?.length || q.novo === "1"}><summary>+ Nova etiqueta</summary>
        <form action={saveLabelForm} className="form-grid" style={{ paddingBottom: 16 }}><Fields /><div><button className="btn btn-primary btn-sm">Criar etiqueta</button></div></form>
      </details>
      <div className="card"><div className="card-h"><h2>{labels?.length || 0} etiquetas</h2><span className="small muted">dica: dentro de cada tarefa, marca ou creator, toque em “＋ Etiqueta” para colocar ou criar na hora</span></div>
        {labels?.length ? <div className="list">{labels.map((l: any) => (
          <div className="li" key={l.id} style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
            <span className="lbl" style={{ background: l.color, color: textOn(l.color), minWidth: 110, justifyContent: "center", padding: "7px 12px" }}>{l.name}</span>
            <div className="grow"><span>{l.scope === "Todas" ? "Em tudo" : `Só em ${l.scope}`} · {uses(l.id)}</span></div>
            <details className="mod" style={{ width: "100%", padding: "0 10px" }}><summary className="small">Editar</summary>
              <form action={saveLabelForm} className="form-grid" style={{ paddingBottom: 12 }}><input type="hidden" name="id" value={l.id} /><Fields l={l} /><div><button className="btn btn-primary btn-sm">Salvar</button></div></form>
              {profile.role === "ceo" || l.created_by === profile.id ? <div style={{ paddingBottom: 12 }}><ConfirmDelete action={deleteLabelForm} fields={{ id: l.id }} label="Excluir etiqueta" warning="A etiqueta será apagada e sai de todos os itens onde estava. Os itens continuam." /></div> : null}
            </details>
          </div>))}</div> : <p className="muted">Nenhuma etiqueta ainda. Crie a primeira acima.</p>}
      </div>
    </>
  );
}
