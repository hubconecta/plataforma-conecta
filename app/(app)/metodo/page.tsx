import Link from "next/link";
import { loadMetodo } from "@/lib/metodo-data";
import { Notice, fd, brl } from "@/components/ui";
import { startCheckout } from "./actions";

export default async function Metodo({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { access, staff, pendingCheckout, mods, lessons, ordered, done, covers, cfg, profile } = await loadMetodo();
  const total = ordered.length, nDone = ordered.filter((l: any) => done.has(l.id)).length;
  const pct = total ? Math.round((nDone / total) * 100) : 0;
  const next = ordered.find((l: any) => !done.has(l.id));
  const first = (profile?.name || "").split(" ")[0];

  if (!access) return (
    <div className="mx">
      <Notice q={q} />
      <section className="mx-hero"><span className="eyebrow" style={{ color: "#FF8CC4" }}>Clube Conecta · Educação</span><h1>Método <em>Criadora Expert</em></h1><p>O passo a passo da Conecta para você crescer como creator, fechar com marcas e vender com o seu conteúdo. {mods.length} módulos com aulas em vídeo, materiais e exercícios.</p>
        <div className="mx-benefits">{[["Aulas práticas", "Do posicionamento à negociação com marcas."], ["Materiais e exercícios", "PDFs e tarefas para aplicar na hora."], ["Acesso pela plataforma", "Estude no seu ritmo, no celular ou computador."]].map(([t, d]) => <div key={t}><b>{t}</b><span>{d}</span></div>)}</div>
        {pendingCheckout ? <p className="mx-note">Checkout iniciado em {fd(String(pendingCheckout.created_at).slice(0, 10))}. O acesso é liberado assim que a B4YOU confirmar o pagamento.</p> : null}
        <form action={startCheckout}><button className="btn btn-primary mx-cta">QUERO ACESSAR O MÉTODO{cfg.price ? ` · ${brl(cfg.price)}` : ""}</button></form>
        <p className="mx-note">Use no pagamento o mesmo e-mail do seu cadastro na Conecta ({profile?.email}) para o acesso ser liberado automaticamente.</p>
      </section>
      {mods.length ? <><h2 className="mx-h">O que você vai aprender</h2><div className="mx-row">{mods.map((m: any, i: number) => <div key={m.id} className="mx-card locked" style={{ background: covers.get(m.id) ? `center/cover url(${covers.get(m.id)})` : m.color || "#E6007E" }}><span className="mx-num">Módulo {i + 1}</span><b>{m.title}</b><span className="mx-lock">🔒</span></div>)}</div></> : null}
    </div>
  );

  return (
    <div className="mx">
      <Notice q={q} />
      {staff && profile?.role !== "creator" ? <div className="notice info">Prévia da área de membros como a aluna vê. <Link href="/metodo/admin">Voltar para Gerenciar Método</Link></div> : null}
      <section className="mx-hero"><span className="eyebrow" style={{ color: "#FF8CC4" }}>Área de membros</span><h1>{first ? `Bora estudar, ${first}!` : "Método Criadora Expert"}</h1>
        <div className="mx-progress"><div><b>{pct}%</b> concluído · {nDone} de {total} aulas</div><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
        {next ? <Link className="btn btn-primary mx-cta" href={`/metodo/aula/${next.id}`}>{nDone ? "▶ Continuar" : "▶ Começar"}: {next.title}</Link> : total ? <p><b>Você concluiu todas as aulas. Parabéns! 🎉</b></p> : <p>As aulas estão sendo preparadas. Você será avisada quando forem publicadas.</p>}
      </section>
      {mods.map((m: any, i: number) => { const ls = lessons.filter((l: any) => l.module_id === m.id); if (!ls.length) return null; const md = ls.filter((l: any) => done.has(l.id)).length; return (
        <section key={m.id}>
          <div className="mx-modh"><div><span className="mx-num">Módulo {i + 1}</span><h2 className="mx-h" style={{ margin: 0 }}>{m.title}</h2>{m.description ? <p className="small muted">{m.description}</p> : null}</div><span className="small muted">{md}/{ls.length} aulas</span></div>
          <div className="mx-row">{ls.map((l: any, j: number) => <Link key={l.id} href={`/metodo/aula/${l.id}`} className={`mx-card ${done.has(l.id) ? "done" : ""}`} style={{ background: covers.get(m.id) ? `linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.85)),center/cover url(${covers.get(m.id)})` : `linear-gradient(160deg,${m.color || "#E6007E"},#000)` }}><span className="mx-num">Aula {j + 1} · {l.type}{l.duration ? ` · ${l.duration}` : ""}</span><b>{l.title}</b>{done.has(l.id) ? <span className="mx-check">✓ Concluída</span> : null}</Link>)}</div>
        </section>); })}
    </div>
  );
}
