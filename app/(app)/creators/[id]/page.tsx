import Link from "next/link";
import { loadLabels } from "@/lib/labels";
import LabelPicker from "@/components/LabelPicker";
import { setCreatorBase, addCreatorBrand, removeCreatorBrand } from "../actions";
import { addCreatorToCampaign } from "../../actions";
import { can } from "@/lib/perms";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Notice, Avatar, Kpi, fd, brl } from "@/components/ui";
import LevelBadge, { levelOf } from "@/components/LevelBadge";
import FileUpload from "@/components/FileUpload";
import ConfirmDelete from "@/components/ConfirmDelete";
import { signedDoc } from "@/lib/storage";
import { addCreatorFile, deleteCreatorFile } from "../../perfil/actions";

export default async function CreatorPerfil({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("creators");
  const { data: c } = await supabase.from("creators").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: levels }, { data: files }, { data: apps }, { data: conts }, { data: pts }] = await Promise.all([
    supabase.from("levels").select("*").order("position"),
    supabase.from("creator_files").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
    supabase.from("campaign_applications").select("status, campaign_id, campaigns(name, brands(name))").eq("creator_id", id).order("created_at", { ascending: false }),
    supabase.from("contents").select("status,views,interactions").eq("creator_id", id),
    supabase.from("points_log").select("points,reason,created_at").eq("creator_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  const lv = levelOf(levels || [], c.xp || 0);
  const links = await Promise.all((files || []).map((f: any) => signedDoc(f.path)));
  const here = `/creators/${id}`;
  const ig = c.instagram ? `https://instagram.com/${String(c.instagram).replace(/^@/, "")}` : "", tt = c.tiktok ? `https://tiktok.com/@${String(c.tiktok).replace(/^@/, "")}` : "";
  const LB = await loadLabels(supabase, "creator", [id]);
  const { data: cbs } = await supabase.from("creator_brands").select("brand_id, source, created_at").eq("creator_id", id);
  const [{ data: allBrands }, { data: openCamps }] = await Promise.all([
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("campaigns").select("id,name,status,brands(name)").not("status", "in", "(Encerrada,Recusada,Em aprovação,Ajuste solicitado)").order("created_at", { ascending: false }),
  ]);
  const inB = new Set((cbs || []).map((x: any) => x.brand_id));
  const bnames = (allBrands || []).filter((b: any) => inB.has(b.id));
  const inCamp = new Set((apps || []).filter((a: any) => a.status === "Aprovada").map((a: any) => a.campaign_id));
  return (
    <>
      <PageH eyebrow="Perfil da creator" title={c.artist_name || c.name} right={<Link className="btn btn-ghost btn-sm" href="/creators">Voltar</Link>} />
      <Notice q={q} />
      <div className="card"><div className="card-h"><div><h2>{c.brand_only ? "Creator só da marca" : "Base completa da Conecta"}</h2><span className="small muted">{c.brand_only ? "Vê só os desafios das marcas abaixo (sem oportunidades, comunidade e Club Criadora)." : "Tem o Clube Conecta completo."}</span></div>
        <form action={setCreatorBase}><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="full" value={c.brand_only ? "1" : "0"} /><button className={`btn btn-sm ${c.brand_only ? "btn-primary" : "btn-ghost"}`}>{c.brand_only ? "Colocar na base da Conecta" : "Deixar só com as marcas dela"}</button></form></div>
        <div className="chips">{bnames.length ? bnames.map((b: any) => <span key={b.id} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Link href={`/marcas/${b.id}#base`} style={{ color: "inherit", textDecoration: "none" }}>🏷️ {b.name}</Link><form action={removeCreatorBrand} style={{ display: "inline" }}><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="brand_id" value={b.id} /><input type="hidden" name="back" value={here} /><button className="link-btn" aria-label={`Tirar da base da ${b.name}`} title="Tirar da base desta marca" style={{ border: 0, background: "none", cursor: "pointer", fontWeight: 800 }}>×</button></form></span>) : <span className="small muted">Ainda não está na base de nenhuma marca.</span>}</div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <form action={addCreatorBrand} className="field" style={{ gap: 6 }}><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="back" value={here} /><label>Colocar na base da marca</label><div style={{ display: "flex", gap: 6 }}><select className="input" name="brand_id" required defaultValue=""><option value="" disabled>Escolha a marca</option>{(allBrands || []).filter((b: any) => !inB.has(b.id)).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="btn btn-dark btn-sm">Adicionar</button></div></form>
          {can(profile, "candidaturas") ? <form action={addCreatorToCampaign} className="field" style={{ gap: 6 }}><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="back" value={here} /><label>Colocar numa campanha (já aprovada)</label><div style={{ display: "flex", gap: 6 }}><select className="input" name="campaign_id" required defaultValue=""><option value="" disabled>Escolha a campanha</option>{(openCamps || []).filter((x: any) => !inCamp.has(x.id)).map((x: any) => <option key={x.id} value={x.id}>{x.name}{x.brands?.name ? ` · ${x.brands.name}` : ""} ({x.status})</option>)}</select><button className="btn btn-dark btn-sm">Incluir</button></div></form> : null}
        </div></div>
      <div className="lbl-detail"><span className="small muted">🏷 Etiquetas</span><LabelPicker all={LB.usable("creator")} on={LB.ids("creator", id)} entity="creator" id={id} /></div>
      <div className="card profile-head">
        <Avatar name={c.name} src={c.avatar_path} size={88} star={lv.cur?.color} title={lv.cur?.name} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><h2>{c.name}</h2><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><LevelBadge level={lv.cur} /><span className="small muted">{c.xp || 0} pontos{lv.next ? ` · faltam ${lv.next.min_points - (c.xp || 0)} para ${lv.next.name}` : ""}</span></div>
          <span className="small muted">{[c.kind, c.niche, c.city && `${c.city}/${c.state || ""}`].filter(Boolean).join(" · ")}</span>
          <div className="socials">{ig ? <a className="btn btn-ghost btn-sm" href={ig} target="_blank" rel="noopener noreferrer">Instagram {c.instagram}</a> : null}{tt ? <a className="btn btn-ghost btn-sm" href={tt} target="_blank" rel="noopener noreferrer">TikTok {c.tiktok}</a> : null}{c.youtube ? <a className="btn btn-ghost btn-sm" href={c.youtube.startsWith("http") ? c.youtube : `https://youtube.com/${c.youtube}`} target="_blank" rel="noopener noreferrer">YouTube</a> : null}{c.whatsapp ? <a className="btn btn-ghost btn-sm" href={`https://wa.me/55${String(c.whatsapp).replace(/\D/g, "").replace(/^55/, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}{can(profile, "gamificacao") ? <Link className="btn btn-dark btn-sm" href={`/gamificacao?tab=dar&c=${id}`}>Dar pontos</Link> : null}</div>
        </div>
      </div>
      {c.bio ? <div className="card"><p style={{ whiteSpace: "pre-wrap" }}>{c.bio}</p></div> : null}
      <div className="kpis"><Kpi k="Seguidores" v={(c.followers || 0).toLocaleString("pt-BR")} hero /><Kpi k="Campanhas aprovadas" v={(apps || []).filter((a: any) => a.status === "Aprovada").length} /><Kpi k="Conteúdos" v={conts?.length || 0} /><Kpi k="Visualizações" v={(conts || []).reduce((s: number, x: any) => s + (x.views || 0), 0).toLocaleString("pt-BR")} /><Kpi k="Pontos" v={c.xp || 0} /></div>
      <div className="grid g2">
        <div className="card"><div className="card-h"><h2>Media kit e relatórios</h2></div>
          {files?.length ? <div className="list">{files.map((f: any, i: number) => <div className="li" key={f.id}><div className="grow"><b>{f.title}</b><span>{f.kind} · {fd(String(f.created_at).slice(0, 10))}</span></div><a className="btn btn-ghost btn-sm" href={links[i]} target="_blank" rel="noopener noreferrer">Abrir</a><ConfirmDelete action={deleteCreatorFile} fields={{ id: f.id, back: here }} label="Remover" warning="O arquivo sai do perfil da creator." /></div>)}</div> : <p className="muted small">Ela ainda não enviou arquivos.</p>}
          <details className="mod" style={{ marginTop: 10 }}><summary className="small">+ Adicionar arquivo por ela</summary><form action={addCreatorFile} className="form-grid" style={{ paddingBottom: 12 }}><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="back" value={here} /><div className="field"><label>Tipo</label><select className="input" name="kind">{["Media kit", "Relatório de vendas", "Portfólio", "Outro"].map((k) => <option key={k}>{k}</option>)}</select></div><div className="field"><label>Título</label><input className="input" name="title" /></div><FileUpload name="path" bucket="docs" folder="creators" label="Arquivo" /><div style={{ alignSelf: "end" }}><button className="btn btn-dark btn-sm">Adicionar</button></div></form></details>
        </div>
        <div className="card"><div className="card-h"><h2>Campanhas</h2></div>{apps?.length ? <div className="list">{apps.map((a: any, i: number) => <div className="li" key={i}><div className="grow"><b>{a.campaigns?.name}</b><span>{a.campaigns?.brands?.name}</span></div><Pill s={a.status} /></div>)}</div> : <p className="muted small">Ainda não participou de campanhas.</p>}</div>
      </div>
      {pts?.length ? <div className="card"><div className="card-h"><h2>Últimos pontos</h2><Link className="btn btn-ghost btn-sm" href="/gamificacao?tab=historico">Histórico</Link></div><div className="list">{pts.map((p: any, i: number) => <div className="li" key={i}><div className="grow"><b>{p.reason}</b><span>{fd(String(p.created_at).slice(0, 10))}</span></div><span className="count" style={{ color: p.points < 0 ? "var(--bad)" : "var(--ok)" }}>{p.points > 0 ? "+" : ""}{p.points}</span></div>)}</div></div> : null}
    </>
  );
}
