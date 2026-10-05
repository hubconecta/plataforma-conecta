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
import FormResponses from "@/components/FormResponses";


export default async function Formulario({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("formularios");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const [{ data: camps }, { data: brands }] = await Promise.all([
    supabase.from("campaigns").select("id,name").order("created_at", { ascending: false }),
    supabase.from("brands").select("id,name").order("name"),
  ]);
  if (id === "novo") return (<><PageH eyebrow="Formulários" title="Novo formulário" right={<Link className="btn btn-ghost btn-sm" href="/formularios">Voltar</Link>} /><Notice q={q} /><div className="card"><FormBuilder campaigns={camps || []} brands={brands || []} action={saveForm} site={site} /></div></>);
  const { data: f } = await supabase.from("forms").select("*").eq("id", id).single();
  if (!f) notFound();
  const tab = q.tab === "respostas" ? "respostas" : "editar";
  const ceo = profile.role === "ceo";
  const { data: resp } = tab === "respostas" ? await supabase.from("form_responses").select("*, creators(name)").eq("form_id", id).order("created_at", { ascending: false }) : { data: [] as any[] };
  const fields: any[] = f.fields || [];
  const brandName = (brands || []).find((b: any) => b.id === f.brand_id)?.name;
  const LB = await loadLabels(supabase, "form", [id]);
  return (
    <>
      <PageH eyebrow={`Formulário · ${f.use}`} title={f.title} sub={`${site}/f/${f.slug}`} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}><Link className="btn btn-ghost btn-sm" href="/formularios">Voltar</Link><CopyText text={`${site}/f/${f.slug}`} label="Copiar link" /><a className="btn btn-ghost btn-sm" href={`/f/${f.slug}`} target="_blank">Ver</a><Pill s={f.status} /></div>} />
      <Notice q={q} />
      {brandName ? <div className="notice info">Formulário exclusivo da marca <b>{brandName}</b>: as respostas aparecem no Portal da Marca e cada creator entra na base desta marca{f.create_access ? " com acesso só aos desafios dela" : ""}.</div> : null}
      <div className="lbl-detail"><span className="small muted">🏷 Etiquetas</span><LabelPicker all={LB.usable("form")} on={LB.ids("form", id)} entity="form" id={id} /></div>
      <div className="tabs"><Link className={`tab ${tab === "editar" ? "on" : ""}`} href={`/formularios/${id}`}>Editar</Link><Link className={`tab ${tab === "respostas" ? "on" : ""}`} href={`/formularios/${id}?tab=respostas`}>Respostas</Link></div>
      {tab === "editar" ? <><div className="card"><FormBuilder f={f} campaigns={camps || []} brands={brands || []} action={saveForm} site={site} /></div>{ceo ? <ConfirmDelete action={deleteForm} fields={{ id }} label="Excluir formulário" warning="Apaga o formulário e todas as respostas." /> : null}</>
        : <FormResponses fields={fields} resp={resp || []} sensitive={ceo} join={!!f.ask_join} creatorHref={(c) => `/creators/${c}`} />}
    </>
  );
}
