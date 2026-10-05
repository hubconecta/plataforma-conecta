import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Empty, Notice, Kpi, Person, Pill, fd } from "@/components/ui";
import CopyText from "@/components/CopyText";
import FormResponses from "@/components/FormResponses";

export default async function MarcaFormularios({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("marca_forms");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const brandId = profile.brand_id;
  const [{ data: forms }, { data: base }] = await Promise.all([
    supabase.from("forms").select("id,title,slug,status,fields,ask_join,created_at").eq("brand_id", brandId).order("created_at", { ascending: false }),
    supabase.from("creator_brands").select("created_at, creators(id,name,instagram,tiktok,avatar_path)").eq("brand_id", brandId).order("created_at", { ascending: false }),
  ]);
  const list = forms || [];
  const sel = list.find((f: any) => f.id === q.f) || list[0];
  const { data: resp } = sel ? await supabase.from("form_responses").select("*, creators(name)").eq("form_id", sel.id).order("created_at", { ascending: false }) : { data: [] as any[] };
  const tab = q.tab === "base" ? "base" : "respostas";
  return (
    <>
      <PageH eyebrow="Sua marca" title="Formulários e creators" sub="Formulários exclusivos que a Conecta criou para a sua marca, as respostas das creators e a sua base de creators." />
      <Notice q={q} />
      <div className="kpis"><Kpi k="Creators na sua base" v={base?.length || 0} hero /><Kpi k="Formulários" v={list.length} /><Kpi k="Respostas no formulário" v={resp?.length || 0} /></div>
      <div className="tabs"><Link className={`tab ${tab === "respostas" ? "on" : ""}`} href="/portal/formularios">Respostas</Link><Link className={`tab ${tab === "base" ? "on" : ""}`} href="/portal/formularios?tab=base">Base de creators</Link></div>
      {tab === "base" ? (
        <div className="card">{base?.length ? <div className="list">{base.map((b: any, i: number) => b.creators ? <div className="li" key={i}><div className="grow"><Person name={b.creators.name} sub={[b.creators.instagram, b.creators.tiktok].filter(Boolean).join(" · ")} src={b.creators.avatar_path} /></div><span className="small muted">desde {fd(String(b.created_at).slice(0, 10))}</span></div> : null)}</div>
          : <Empty icon="users" title="Sua base ainda está vazia" text="As creators que responderem ao formulário da sua marca aparecem aqui." />}</div>
      ) : list.length ? (<>
        <div className="chips">{list.map((f: any) => <Link key={f.id} className={`chip ${sel?.id === f.id ? "on" : ""}`} href={`/portal/formularios?f=${f.id}`}>{f.title}</Link>)}</div>
        {sel ? <div className="card"><div className="card-h"><div><h2>{sel.title}</h2><span className="small muted">{site}/f/{sel.slug}</span></div><div className="actions"><Pill s={sel.status} />{sel.status === "Publicado" ? <><CopyText text={`${site}/f/${sel.slug}`} label="Copiar link" /><a className="btn btn-ghost btn-sm" href={`/f/${sel.slug}`} target="_blank" rel="noopener noreferrer">Ver</a></> : null}</div></div>
          <p className="small muted">Mande este link no grupo das creators da sua marca. Cada resposta chega aqui e você recebe uma notificação.</p></div> : null}
        {sel ? <FormResponses fields={sel.fields || []} resp={resp || []} sensitive join={!!sel.ask_join} /> : null}
      </>) : <div className="card"><Empty icon="form" title="Nenhum formulário ainda" text="Peça para a equipe Conecta criar o formulário exclusivo da sua marca." /></div>}
    </>
  );
}
