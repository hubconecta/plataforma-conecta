import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, fd } from "@/components/ui";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/consts";
import { sendContent } from "../../conteudos/actions";

export default async function Minhas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("minhas");
  const [{ data }, { data: conts }] = await Promise.all([
    supabase.from("campaign_applications").select("id,status,created_at,campaign_id,campaigns(name,status,start_date,end_date,deliverables,briefing)").eq("creator_id", profile.creator_id).order("created_at", { ascending: false }),
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
              {a.campaigns?.deliverables ? <p className="small"><b>Entregáveis:</b> {a.campaigns.deliverables}</p> : null}
              {a.status === "Aprovada" && a.campaigns?.briefing ? <p className="small" style={{ whiteSpace: "pre-wrap" }}><b>Briefing:</b> {a.campaigns.briefing}</p> : null}
              {mine.length ? <div className="list">{mine.map((c: any) => { const lastAdj = [...(c.history || [])].reverse().find((h: any) => h.internal); return (
                <div className="li" key={c.id} style={{ flexWrap: "wrap" }}><div className="grow"><b>{c.platform} · {c.type}{c.version > 1 ? ` · versão ${c.version}` : ""}</b><span>{c.link ? <a href={c.link} target="_blank" rel="noopener noreferrer">{c.link}</a> : ""}</span>{c.status === "Ajuste solicitado" && lastAdj ? <span style={{ color: "var(--warn)" }}>{lastAdj.txt}</span> : null}</div><Pill s={c.status} />
                  {c.status === "Ajuste solicitado" ? <form action={sendContent} className="inline-form" style={{ width: "100%" }}><input type="hidden" name="id" value={c.id} /><input className="input" name="link" type="url" required placeholder="Link da nova versão" style={{ flex: 1 }} /><button className="btn btn-primary btn-sm">Enviar nova versão</button></form> : null}</div>); })}</div> : null}
              {a.status === "Aprovada" && a.campaigns?.status === "Ativa" ? <form action={sendContent} className="form-grid"><input type="hidden" name="campaign_id" value={a.campaign_id} />
                <div className="field"><label>Plataforma</label><select className="input" name="platform">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
                <div className="field"><label>Formato</label><select className="input" name="type">{CONTENT_TYPES.map((p) => <option key={p}>{p}</option>)}</select></div>
                <div className="field full"><label>Link do conteúdo (post, Drive ou vídeo)</label><input className="input" name="link" type="url" required placeholder="https://" /></div>
                <div><button className="btn btn-primary btn-sm">Enviar conteúdo</button></div></form> : a.status === "Aprovada" ? <p className="small muted">O envio de conteúdo abre quando a campanha estiver ativa.</p> : null}
            </div>
          </details>);
      }) : <Empty icon="megaphone" title="Você ainda não participa de nenhuma campanha" text="Veja as oportunidades abertas e se inscreva." />}
    </>
  );
}
