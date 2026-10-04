import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Person, fd } from "@/components/ui";
import { CONTENT_STATUS } from "@/lib/consts";
import { approveContent, reviewContent, adjustContent, publishContent } from "./actions";

export default async function Conteudos({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("conteudos");
  const isBrand = profile.role === "marca";
  const { data } = await supabase.from("contents").select("*, creators(name,instagram), campaigns(name, brands(name))").order("created_at", { ascending: false });
  const all = data || [];
  const f = CONTENT_STATUS.includes(q.s) ? q.s : q.s === "todos" ? "todos" : isBrand ? "todos" : "abertos";
  const shown = all.filter((c: any) => f === "todos" ? true : f === "abertos" ? ["Enviado", "Em análise"].includes(c.status) : c.status === f);
  const here = `/conteudos?s=${encodeURIComponent(f)}`;
  const H = ({ c }: { c: any }) => <details className="confirm-del"><summary className="btn btn-ghost btn-sm">Histórico</summary><div className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}>{(c.history || []).slice().reverse().map((h: any, i: number) => <p key={i} className="small"><b>{new Date(h.at).toLocaleDateString("pt-BR")}</b> · {isBrand && h.internal ? "Ajuste solicitado pela Conecta" : h.txt}</p>)}</div></details>;
  return (
    <>
      <PageH eyebrow={isBrand ? "Sua marca" : "Operação"} title={isBrand ? "Conteúdos" : "Central de conteúdos"} sub={isBrand ? "Conteúdos das creators nas campanhas da sua marca." : `${all.filter((c: any) => ["Enviado", "Em análise"].includes(c.status)).length} aguardando aprovação`} />
      <Notice q={q} />
      <div className="chips">{(isBrand ? [] : [["abertos", "Aguardando"]]).concat([["todos", "Todos"]], CONTENT_STATUS.filter((s) => all.some((c: any) => c.status === s)).map((s) => [s, s])).map(([k, l]) => <Link key={k} className={`chip ${f === k ? "on" : ""}`} href={`/conteudos?s=${encodeURIComponent(k)}`}>{l}</Link>)}</div>
      <div className="card">{shown.length ? <div className="table-wrap"><table><thead><tr><th>Creator</th><th>Campanha</th><th>Plataforma · tipo</th><th>Data</th><th>Status</th><th className="r">Métricas</th><th></th></tr></thead><tbody>
        {shown.map((c: any) => <tr key={c.id}>
          <td><Person name={c.creators?.name || "Creator"} sub={c.creators?.instagram || ""} /></td>
          <td>{c.campaigns?.name || "—"}{isBrand ? null : <div className="small muted">{c.campaigns?.brands?.name}</div>}</td>
          <td className="small">{c.platform} · {c.type}{c.version > 1 ? ` · v${c.version}` : ""}{c.link ? <div><a href={c.link} target="_blank" rel="noopener noreferrer">Abrir ↗</a></div> : null}</td>
          <td className="num small">{fd(c.published_at || String(c.created_at).slice(0, 10))}</td>
          <td><Pill s={c.status} /></td>
          <td className="r num small">{(c.views || 0).toLocaleString("pt-BR")} views<br />{(c.interactions || 0).toLocaleString("pt-BR")} int.</td>
          <td><div className="actions">
            {!isBrand && ["Enviado", "Em análise"].includes(c.status) ? <>
              <form action={approveContent}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="btn btn-ok btn-sm">Aprovar</button></form>
              {c.status === "Enviado" ? <form action={reviewContent}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="btn btn-ghost btn-sm">Em análise</button></form> : null}
              <details className="confirm-del"><summary className="btn btn-ghost btn-sm">Solicitar ajuste</summary><form action={adjustContent} className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><textarea className="input" name="note" required placeholder="O que precisa mudar?" /><button className="btn btn-dark btn-sm">Enviar pedido</button></form></details></> : null}
            {!isBrand && ["Aprovado", "Publicado"].includes(c.status) ? <details className="confirm-del"><summary className="btn btn-ghost btn-sm">{c.status === "Publicado" ? "Atualizar métricas" : "Marcar publicado"}</summary><form action={publishContent} className="confirm-box" style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><label className="small">Link do post<input className="input" name="link" defaultValue={c.link || ""} /></label><label className="small">Data da publicação<input className="input" type="date" name="published_at" defaultValue={c.published_at || ""} /></label><label className="small">Visualizações<input className="input" type="number" name="views" defaultValue={c.views || 0} /></label><label className="small">Interações<input className="input" type="number" name="interactions" defaultValue={c.interactions || 0} /></label><button className="btn btn-dark btn-sm">Salvar</button></form></details> : null}
            <H c={c} />
          </div></td></tr>)}
      </tbody></table></div> : <Empty icon="film" title="Nenhum conteúdo aqui" text={isBrand ? "Quando as creators enviarem conteúdos das suas campanhas, eles aparecem aqui." : "As creators enviam os conteúdos pelo Clube, em Minhas campanhas."} />}</div>
    </>
  );
}
