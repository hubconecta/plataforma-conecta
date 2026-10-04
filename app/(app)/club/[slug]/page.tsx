import Link from "next/link";
import { loadProduct } from "@/lib/metodo-data";
import { Notice, fd, brl } from "@/components/ui";
import { startCheckout } from "../actions";

export default async function Produto({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<any> }) {
  const { slug } = await params; const q = await searchParams;
  const { product: p, access, staff, pendingCheckout, mods, lessons, ordered, done, covers, profile } = await loadProduct(slug);
  const total = ordered.length, nDone = ordered.filter((l: any) => done.has(l.id)).length;
  const pct = total ? Math.round((nDone / total) * 100) : 0;
  const next = ordered.find((l: any) => !done.has(l.id));
  const first = (profile?.name || "").split(" ")[0];
  const heroBg = p.cover ? { background: `linear-gradient(90deg,rgba(11,11,12,.95) 35%,rgba(11,11,12,.35)),center/cover url(${p.cover})` } : undefined;

  if (!access) return (
    <div className="mx">
      <Link href="/club" className="small" style={{ color: "#FF8CC4" }}>← Club Criadora</Link>
      <Notice q={q} />
      <section className="mx-hero" style={heroBg}><span className="eyebrow" style={{ color: "#FF8CC4" }}>🔒 Club Criadora</span><h1>{p.title}</h1>{p.tagline ? <p><b>{p.tagline}</b></p> : null}{p.description ? <p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p> : null}
        {pendingCheckout ? <p className="mx-note">Checkout iniciado em {fd(String(pendingCheckout.created_at).slice(0, 10))}. O acesso é liberado assim que a B4YOU confirmar o pagamento.</p> : null}
        <form action={startCheckout}><input type="hidden" name="slug" value={p.slug} /><button className="btn btn-primary mx-cta">QUERO ACESSAR{p.price ? ` · ${brl(p.price)}` : ""}</button></form>
        <p className="mx-note">Use no pagamento o mesmo e-mail do seu cadastro na Conecta ({profile?.email}) para o acesso ser liberado automaticamente.</p>
      </section>
      {mods.length ? <><h2 className="mx-h">O que tem dentro</h2><div className="mx-row">{mods.map((m: any, i: number) => <div key={m.id} className="mx-card locked" style={{ background: covers.get(m.id) ? `center/cover url(${covers.get(m.id)})` : `linear-gradient(160deg,${m.color || "#E6007E"},#000)` }}><span className="mx-num">Módulo {i + 1}</span><b>{m.title}</b><span className="mx-lock">🔒</span></div>)}</div></> : null}
    </div>
  );

  return (
    <div className="mx">
      <Link href="/club" className="small" style={{ color: "#FF8CC4" }}>← Club Criadora</Link>
      <Notice q={q} />
      {staff && profile?.role !== "creator" ? <div className="notice info">Prévia da área de membros como a aluna vê. <Link href={`/club/admin/${p.id}`}>Gerenciar este produto</Link></div> : null}
      <section className="mx-hero" style={heroBg}><span className="eyebrow" style={{ color: "#FF8CC4" }}>{p.title}</span><h1>{first ? `Bora, ${first}!` : p.title}</h1>
        <div className="mx-progress"><div><b>{pct}%</b> concluído · {nDone} de {total} aulas</div><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
        {next ? <Link className="btn btn-primary mx-cta" href={`/club/${p.slug}/aula/${next.id}`}>{nDone ? "▶ Continuar" : "▶ Começar"}: {next.title}</Link> : total ? <p><b>Você concluiu tudo. Parabéns! 🎉</b></p> : <p>O conteúdo está sendo preparado. Você será avisada quando for publicado.</p>}
      </section>
      {mods.map((m: any, i: number) => { const ls = lessons.filter((l: any) => l.module_id === m.id); if (!ls.length) return null; return (
        <section key={m.id}>
          <div className="mx-modh"><div><span className="mx-num">Módulo {i + 1}</span><h2 className="mx-h" style={{ margin: 0 }}>{m.title}</h2>{m.description ? <p className="small muted">{m.description}</p> : null}</div><span className="small muted">{ls.filter((l: any) => done.has(l.id)).length}/{ls.length}</span></div>
          <div className="mx-row">{ls.map((l: any, j: number) => <Link key={l.id} href={`/club/${p.slug}/aula/${l.id}`} className={`mx-card ${done.has(l.id) ? "done" : ""}`} style={{ background: covers.get(m.id) ? `linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.85)),center/cover url(${covers.get(m.id)})` : `linear-gradient(160deg,${m.color || "#E6007E"},#000)` }}><span className="mx-num">{j + 1} · {l.type}{l.duration ? ` · ${l.duration}` : ""}</span><b>{l.title}</b>{done.has(l.id) ? <span className="mx-check">✓ Concluída</span> : null}</Link>)}</div>
        </section>); })}
    </div>
  );
}
