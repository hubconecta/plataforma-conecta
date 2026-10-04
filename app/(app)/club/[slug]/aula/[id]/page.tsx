import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadProduct } from "@/lib/metodo-data";
import { signed } from "@/lib/storage";
import { embedUrl } from "@/lib/metodo";
import { toggleLesson } from "../../../actions";

export default async function Aula({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id, slug } = await params;
  const { access, mods, ordered, done, product } = await loadProduct(slug);
  if (!access) redirect(`/club/${slug}`);
  const i = ordered.findIndex((l: any) => l.id === id);
  if (i < 0) notFound();
  const l = ordered[i], prev = ordered[i - 1], next = ordered[i + 1];
  const mod = mods.find((m: any) => m.id === l.module_id);
  const v = l.video_path ? { kind: "video" as const, src: await signed(l.video_path, 4 * 3600) } : embedUrl(l.video_url);
  const pdf = l.pdf_path ? await signed(l.pdf_path, 3600) : "";
  const isDone = done.has(l.id);
  return (
    <div className="mx mx-lesson">
      <div className="mx-main">
        <Link href={`/club/${slug}`} className="small" style={{ color: "#FF8CC4" }}>← {product.title}</Link>
        <div className="mx-player">
          {v.kind === "iframe" ? <iframe src={v.src} title={l.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen /> : v.kind === "video" ? <video src={v.src} controls controlsList="nodownload" playsInline /> : <div className="mx-noplayer">{v.kind === "link" ? <a className="btn btn-primary" href={v.src} target="_blank" rel="noopener noreferrer">Abrir aula ↗</a> : <span>{l.type === "Vídeo" ? "Vídeo em breve" : l.type}</span>}</div>}
        </div>
        <span className="mx-num">{mod?.title} · {l.type}{l.duration ? ` · ${l.duration}` : ""}</span>
        <h1 className="mx-title">{l.title}</h1>
        <div className="mx-actions">
          {prev ? <Link className="btn btn-ghost btn-sm" href={`/club/${slug}/aula/${prev.id}`}>← Anterior</Link> : <span />}
          <form action={toggleLesson}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="done" value={isDone ? "1" : "0"} /><input type="hidden" name="next" value={next?.id || ""} /><input type="hidden" name="slug" value={slug} /><button className={`btn btn-sm ${isDone ? "btn-ok" : "btn-primary"}`}>{isDone ? "✓ Concluída (desmarcar)" : "Marcar como concluída"}</button></form>
          {next ? <Link className="btn btn-ghost btn-sm" href={`/club/${slug}/aula/${next.id}`}>Próxima →</Link> : <span />}
        </div>
        {l.description ? <div className="mx-box"><h3>Sobre a aula</h3><p style={{ whiteSpace: "pre-wrap" }}>{l.description}</p></div> : null}
        {pdf ? <div className="mx-box"><h3>Material para download</h3><a className="btn btn-dark btn-sm" href={pdf} target="_blank" rel="noopener noreferrer">Baixar arquivo</a></div> : null}
        {l.exercise ? <div className="mx-box"><h3>Exercício</h3><p style={{ whiteSpace: "pre-wrap" }}>{l.exercise}</p></div> : null}
      </div>
      <aside className="mx-side">
        {mods.map((m: any, mi: number) => { const ls = ordered.filter((x: any) => x.module_id === m.id); if (!ls.length) return null; return (
          <details key={m.id} open={m.id === l.module_id}><summary><span className="mx-num">Módulo {mi + 1}</span><b>{m.title}</b><span className="small">{ls.filter((x: any) => done.has(x.id)).length}/{ls.length}</span></summary>
            {ls.map((x: any) => <Link key={x.id} href={`/club/${slug}/aula/${x.id}`} className={`mx-li ${x.id === l.id ? "on" : ""}`}><span className={`mx-dot ${done.has(x.id) ? "ok" : ""}`}>{done.has(x.id) ? "✓" : ""}</span><span>{x.title}<small>{x.duration || x.type}</small></span></Link>)}
          </details>); })}
      </aside>
    </div>
  );
}
