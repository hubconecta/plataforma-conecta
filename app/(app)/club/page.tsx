import Link from "next/link";
import { loadVitrine } from "@/lib/metodo-data";
import { Notice, brl } from "@/components/ui";

export default async function Club({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { products, staff, profile } = await loadVitrine();
  const first = (profile?.name || "").split(" ")[0];
  return (
    <div className="mx">
      <Notice q={q} />
      {staff && profile?.role !== "creator" ? <div className="notice info">Prévia da vitrine como a creator vê. <Link href="/club/admin">Gerenciar Club Criadora</Link></div> : null}
      <section className="mx-hero"><span className="eyebrow" style={{ color: "#FF8CC4" }}>Clube Conecta · Educação</span><h1>Club <em>Criadora</em></h1><p>{first ? `${first}, aqui ficam` : "Aqui ficam"} os cursos e materiais da Conecta. Os que você já tem abrem direto; os outros você pode desbloquear quando quiser.</p></section>
      <div className="mx-shelf">{products.map((p: any) => (
        <Link key={p.id} href={`/club/${p.slug}`} className={`mx-prod ${p.access ? "" : "locked"}`}>
          <div className="mx-poster" style={{ background: p.cover ? `center/cover url(${p.cover})` : `linear-gradient(160deg,${p.color || "#E6007E"},#000)` }}>{p.cover ? null : <b>{p.title}</b>}{p.access ? null : <span className="mx-lock">🔒</span>}</div>
          <div className="mx-prod-b"><b>{p.title}</b>{p.tagline ? <span>{p.tagline}</span> : null}<span className={`mx-tag ${p.access ? "ok" : ""}`}>{p.access ? "▶ Acessar" : p.pending ? "Pagamento em confirmação" : `Desbloquear${p.price ? ` · ${brl(p.price)}` : ""}`}</span></div>
        </Link>))}</div>
      {!products.length ? <p className="muted">Os produtos do Club Criadora aparecem aqui em breve.</p> : null}
    </div>
  );
}
