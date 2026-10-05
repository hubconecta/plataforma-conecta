import Link from "next/link";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Notice, Empty } from "@/components/ui";
import CopyText from "@/components/CopyText";
import ConfirmDelete from "@/components/ConfirmDelete";
import FormBuilder from "../FormBuilder";
import { saveForm, deleteForm } from "../actions";

const show = (v: any, type: string, ceo: boolean) => {
  if (v == null || v === "") return "";
  if (!ceo && ["cpf", "endereco"].includes(type)) return "protegido";
  if (type === "endereco" && typeof v === "object") return `${v.street || ""}, ${v.number || ""}${v.comp ? " " + v.comp : ""} · ${v.district || ""} · ${v.city || ""}/${v.uf || ""} · ${v.cep || ""}`;
  return Array.isArray(v) ? v.join(", ") : String(v);
};

export default async function Formulario({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("formularios");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { data: camps } = await supabase.from("campaigns").select("id,name").order("created_at", { ascending: false });
  if (id === "novo") return (<><PageH eyebrow="Formulários" title="Novo formulário" right={<Link className="btn btn-ghost btn-sm" href="/formularios">Voltar</Link>} /><Notice q={q} /><div className="card"><FormBuilder campaigns={camps || []} action={saveForm} site={site} /></div></>);
  const { data: f } = await supabase.from("forms").select("*").eq("id", id).single();
  if (!f) notFound();
  const tab = q.tab === "respostas" ? "respostas" : "editar";
  const ceo = profile.role === "ceo";
  const { data: resp } = tab === "respostas" ? await supabase.from("form_responses").select("*, creators(name)").eq("form_id", id).order("created_at", { ascending: false }) : { data: [] as any[] };
  const fields: any[] = f.fields || [];
  const tsv = [["Quando", "Creator", ...fields.map((x) => x.label)].join("\t"), ...(resp || []).map((r: any) => [new Date(r.created_at).toLocaleString("pt-BR"), r.creators?.name || "visitante", ...fields.map((x) => show(r.answers?.[x.id], x.type, ceo).replace(/\s+/g, " "))].join("\t"))].join("\n");
  const LB = await loadLabels(supabase, "form", [id]);
  return (
    <>
      <PageH eyebrow={`Formulário · ${f.use}`} title={f.title} sub={`${site}/f/${f.slug}`} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}><Link className="btn btn-ghost btn-sm" href="/formularios">Voltar</Link><CopyText text={`${site}/f/${f.slug}`} label="Copiar link" /><a className="btn btn-ghost btn-sm" href={`/f/${f.slug}`} target="_blank">Ver</a><Pill s={f.status} /></div>} />
      <Notice q={q} />
      <div className="lbl-detail"><span className="small muted">🏷 Etiquetas</span><LabelPicker all={LB.usable("form")} on={LB.ids("form", id)} entity="form" id={id} /></div>
      <div className="tabs"><Link className={`tab ${tab === "editar" ? "on" : ""}`} href={`/formularios/${id}`}>Editar</Link><Link className={`tab ${tab === "respostas" ? "on" : ""}`} href={`/formularios/${id}?tab=respostas`}>Respostas</Link></div>
      {tab === "editar" ? <><div className="card"><FormBuilder f={f} campaigns={camps || []} action={saveForm} site={site} /></div>{ceo ? <ConfirmDelete action={deleteForm} fields={{ id }} label="Excluir formulário" warning="Apaga o formulário e todas as respostas." /> : null}</>
        : <div className="card"><div className="card-h"><h2>{resp?.length || 0} respostas</h2>{resp?.length ? <CopyText text={tsv} /> : null}</div>{resp?.length ? <div className="table-wrap"><table><thead><tr><th>Quando</th><th>Creator</th>{fields.map((x) => <th key={x.id}>{x.label}</th>)}</tr></thead><tbody>{resp.map((r: any) => <tr key={r.id}><td className="num small">{new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td><td>{r.creators?.name || "visitante"}</td>{fields.map((x) => { const v = show(r.answers?.[x.id], x.type, ceo); return <td key={x.id} className="small">{x.type === "upload" && v.startsWith("http") ? <a href={v} target="_blank" rel="noopener noreferrer">Abrir</a> : v}</td>; })}</tr>)}</tbody></table></div> : <Empty icon="inbox" title="Nenhuma resposta ainda" text="Publique o formulário e envie o link." />}</div>}
    </>
  );
}
