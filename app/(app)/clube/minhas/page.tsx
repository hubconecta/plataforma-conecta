import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/consts";
import { sendContent } from "../../conteudos/actions";
import MultiLinks from "@/components/MultiLinks";

export default async function Minhas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("minhas");
  const { data: glinks } = await supabase.from("campaign_links").select("campaign_id,url");
  const GL = new Map((glinks || []).map((x: any) => [x.campaign_id, x.url]));
  const [{ data: steps }, { data: sigs }] = await Promise.all([
    supabase.from("campaign_steps").select("*").order("position"),
    supabase.from("contract_signatures").select("id,campaign_id,status").eq("creator_id", profile.creator_id).neq("status", "Cancelado"),
  ]);
  const [{ data }, { data: conts }] = await Promise.all([
    supabase.from("campaign_applications").select("id,status,created_at,campaign_id,campaigns(name,status,start_date,end_date,deliverables,briefing,contents_per_creator)").eq("creator_id", profile.creator_id).order("created_at", { ascending: false }),
    supabase.from("contents").select("*").eq("creator_id", profile.creator_id).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageH eyebrow="Clube Conecta" title="Minhas campanhas" />
      <Notice q={q} />
      {data?.length ? data.map((a: any) => {
        const mine = (conts || []).filter((c: any) => c.campaign_id === a.campaign_id);
        return (
          <details className="mod" key={a.id} open={a.status === "Aprovada" && a.campaigns?.status === "Ativa"}>
            <summary><span style={{ flex: 1, minWidth: 0 }}>{a.campaigns?.name}<br /><span className="small muted" style={{ fontWeight: 500 }}>{fd(a.campaigns?.start_date)} – {fd(a.campaigns?.end_date)} · inscrição {fd(String(a.created_at).slice(0, 10))}</span></span><Pill s={a.status} /></summary>
            <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {a.status === "Aprovada" ? (() => { const sg: any = (sigs || []).find((x: any) => x.campaign_id === a.campaign_id); return sg ? <div className={`notice ${sg.status === "Aguardando creator" ? "bad" : "ok"}`}>📄 Contrato: <b>{sg.status === "Aguardando creator" ? "falta a sua assinatura" : sg.status === "Aguardando marca" ? "você já assinou, falta a marca" : "assinado ✓"}</b> · <a href={`/contrato/${sg.id}`}>{sg.status === "Aguardando creator" ? "Ler e assinar" : "Ver contrato"}</a></div> : null; })() : null}
              {a.status === "Aprovada" && (steps || []).some((x: any) => x.campaign_id === a.campaign_id) ? <div className="steps"><b className="small">👉 Próximos passos</b>{(steps || []).filter((x: any) => x.campaign_id === a.campaign_id).map((x: any, i: number) => <div className="step" key={x.id}><span className="step-n">{i + 1}</span><div className="grow"><b>{x.title}</b>{x.description ? <span className="small muted">{x.description}</span> : null}</div>{x.url ? <a className="btn btn-primary btn-sm" href={x.url} target="_blank" rel="noopener noreferrer">Abrir</a> : null}</div>)}</div> : null}
              {a.status === "Aprovada" && GL.get(a.campaign_id) ? <a className="btn btn-ok btn-sm" style={{ alignSelf: "flex-start" }} href={GL.get(a.campaign_id)} target="_blank" rel="noopener noreferrer">💬 Entrar no grupo da campanha</a> : null}
              {a.campaigns?.deliverables ? <p className="small"><b>Entregáveis:</b> {a.campaigns.deliverables}</p> : null}
              {a.status === "Aprovada" && a.campaigns?.contents_per_creator ? <p className="small"><b>{mine.length} de {a.campaigns.contents_per_creator}</b> conteúdos enviados</p> : null}
              {a.status === "Aprovada" && a.campaigns?.briefing ? <p className="small" style={{ whiteSpace: "pre-wrap" }}><b>Briefing:</b> {a.campaigns.briefing}</p> : null}
              {mine.length ? <div className="list">{mine.map((c: any) => { const lastAdj = [...(c.history || [])].reverse().find((h: any) => h.internal); return (
                <div className="li" key={c.id} style={{ flexWrap: "wrap" }}><div className="grow"><b>{c.platform} · {c.type}{c.version > 1 ? ` · versão ${c.version}` : ""}</b><span>{c.link ? <a href={c.link} target="_blank" rel="noopener noreferrer">{c.link}</a> : ""}</span>{c.status === "Ajuste solicitado" && lastAdj ? <span style={{ color: "var(--warn)" }}>{lastAdj.txt}</span> : null}</div><Pill s={c.status} />
                  {c.status === "Ajuste solicitado" ? <form action={sendContent} className="inline-form" style={{ width: "100%" }}><input type="hidden" name="id" value={c.id} /><MultiLinks label="Link(s) da nova versão" required /><button className="btn btn-primary btn-sm">Enviar nova versão</button></form> : null}</div>); })}</div> : null}
              {a.status === "Aprovada" && a.campaigns?.status === "Ativa" ? <form action={sendContent} className="form-grid"><input type="hidden" name="campaign_id" value={a.campaign_id} />
                <div className="field"><label>Plataforma</label><select className="input" name="platform">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
                <div className="field"><label>Formato</label><select className="input" name="type">{CONTENT_TYPES.map((p) => <option key={p}>{p}</option>)}</select></div>
                <MultiLinks label="Links dos conteúdos (post, Drive ou vídeo)" required />
                <div><button className="btn btn-primary btn-sm">Enviar conteúdo</button></div></form> : a.status === "Aprovada" ? <p className="small muted">O envio de conteúdo abre quando a campanha estiver ativa.</p> : null}
            </div>
          </details>);
      }) : <Empty icon="megaphone" title="Você ainda não participa de nenhuma campanha" text="Veja as oportunidades abertas e se inscreva." />}
    </>
  );
}
