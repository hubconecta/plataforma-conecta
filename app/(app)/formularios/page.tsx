import Link from "next/link";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";
import CopyText from "@/components/CopyText";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { LabelFilter } from "@/components/Labels";

export default async function Formularios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("formularios");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const L = await loadLabels(supabase, "form");
  const FL = L.usable("form");
  const et = FL.some((l) => l.id === q.et) ? q.et : "";
  const [{ data: allForms }, { data: resp }] = await Promise.all([
    supabase.from("forms").select("*, campaigns(name)").order("created_at", { ascending: false }),
    supabase.from("form_responses").select("form_id"),
  ]);
  const forms = (allForms || []).filter((f: any) => !et || L.has("form", f.id, et));
  const cnt = (id: string) => (resp || []).filter((r: any) => r.form_id === id).length;
  return (
    <>
      <PageH eyebrow="Operação" title="Formulários" sub="Crie formulários com link público para pesquisas, seleções, onboarding e feedback." right={<Link className="btn btn-primary btn-sm" href="/formularios/novo">+ Novo formulário</Link>} />
      <Notice q={q} />
      <LabelFilter labels={FL} active={et} base="/formularios" />
      <div className="card">{forms?.length ? <div className="table-wrap"><table><thead><tr><th>Formulário</th><th>Etiquetas</th><th>Uso</th><th className="r">Campos</th><th className="r">Respostas</th><th>Link público</th><th>Status</th><th></th></tr></thead><tbody>
        {forms.map((f: any) => <tr key={f.id}><td><Link href={`/formularios/${f.id}`}><b>{f.title}</b></Link><div className="small muted">{f.campaigns?.name || "Geral"} · criado {fd(String(f.created_at).slice(0, 10))}</div></td><td><LabelPicker all={FL} on={L.ids("form", f.id)} entity="form" id={f.id} compact /></td><td className="small">{f.use}</td><td className="r num">{f.fields?.length || 0}</td><td className="r num">{cnt(f.id)}</td><td className="small">/f/{f.slug}</td><td><Pill s={f.status} /></td>
          <td><div className="actions"><Link className="btn btn-ghost btn-sm" href={`/formularios/${f.id}?tab=respostas`}>Respostas</Link><a className="btn btn-ghost btn-sm" href={`/f/${f.slug}`} target="_blank">Ver</a><CopyText text={`${site}/f/${f.slug}`} label="Copiar link" /></div></td></tr>)}
      </tbody></table></div> : <Empty icon="form" title="Nenhum formulário ainda" text="Crie o primeiro formulário e envie o link para as creators." />}</div>
      <div className="card"><div className="card-h"><h2>Formulários do sistema</h2></div><div className="list">
        <div className="li"><div className="grow"><b>Cadastro de creators</b><span>Gera cadastros para aprovação · {site}/cadastro</span></div><a className="btn btn-ghost btn-sm" href="/cadastro" target="_blank">Ver</a>{can(profile, "cad_creators") ? <Link className="btn btn-ghost btn-sm" href="/cadastros">Respostas</Link> : null}</div>
        <div className="li"><div className="grow"><b>Quero saber mais (Para Marcas)</b><span>Gera leads no CRM · {site}/para-marcas</span></div><a className="btn btn-ghost btn-sm" href="/para-marcas" target="_blank">Ver</a>{can(profile, "crm") ? <Link className="btn btn-ghost btn-sm" href="/leads">Respostas</Link> : null}</div>
      </div></div>
    </>
  );
}
