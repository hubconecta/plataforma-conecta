import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Kpi, Person, fd, brl } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import ConfirmDelete from "@/components/ConfirmDelete";
import { MOD_STATUS, LESSON_STATUS, LESSON_TYPES } from "@/lib/consts";
import ProductForm from "../../ProductForm";
import { saveModule, deleteModule, saveLesson, deleteLesson, reorder, notifyAll, confirmPurchase, revokePurchase, deleteProduct } from "../../actions";

const KINDS = ["📚 Nova aula disponível", "🆕 Novo módulo liberado", "📎 Material novo", "🔥 Desafio novo", "Atualização do conteúdo", "⏰ Lembrete de estudo"];
const STAGES: [string, string][] = [["todas", "Todas"], ["nao", "Não iniciou"], ["andamento", "Em andamento"], ["quase", "Quase concluído"], ["concluido", "Concluído"]];

export default async function ProdutoAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id: pid } = await params; const q = await searchParams;
  const { supabase, profile } = await requireModule("metodo_adm");
  const { data: prod } = await supabase.from("products").select("*").eq("id", pid).single();
  if (!prod) notFound();
  const tab = ["conteudo", "alunas", "produto"].includes(q.tab) ? q.tab : "conteudo";
  const [{ data: mods }, { data: purchases }, { data: creators }] = await Promise.all([
    supabase.from("method_modules").select("*").eq("product_id", pid).order("position").order("created_at"),
    supabase.from("method_purchases").select("*, creators(name,instagram,email)").eq("product_id", pid).order("created_at", { ascending: false }),
    supabase.from("creators").select("id,name").order("name"),
  ]);
  const modIds = (mods || []).map((m: any) => m.id);
  const { data: lessons } = modIds.length ? await supabase.from("method_lessons").select("*").in("module_id", modIds).order("position").order("created_at") : { data: [] as any[] };
  const { data: progress } = await supabase.from("method_progress").select("creator_id,lesson_id,done_at");
  const visible = (lessons || []).filter((l: any) => l.status === "Publicada" && (mods || []).find((m: any) => m.id === l.module_id)?.status === "Publicado");
  const visIds = new Set(visible.map((l: any) => l.id));
  const paid = (purchases || []).filter((p: any) => p.status === "Pago");
  const pending = (purchases || []).filter((p: any) => p.status === "Aguardando pagamento");
  const myProg = (cid: string) => (progress || []).filter((p: any) => p.creator_id === cid && visIds.has(p.lesson_id));
  const pct = (cid: string) => visible.length ? Math.round((myProg(cid).length / visible.length) * 100) : 0;
  const stage = (p: number) => p === 0 ? "Não iniciou" : p >= 100 ? "Concluído" : p >= 75 ? "Quase concluído" : "Em andamento";
  const sf = STAGES.some((s) => s[0] === q.f) ? q.f : "todas";
  const students = [...new Map(paid.map((p: any) => [p.creator_id, p])).values()].filter((p: any) => { const s = stage(pct(p.creator_id)); return sf === "todas" || STAGES.find((x) => x[0] === sf)?.[1] === s; });
  const H = ({ n, v }: { n: string; v: string }) => <input type="hidden" name={n} value={v} />;
  const ModForm = ({ m }: { m?: any }) => (
    <form action={saveModule} className="form-grid">{m ? <H n="id" v={m.id} /> : null}<H n="product_id" v={pid} />
      <div className="field"><label>Nome do módulo</label><input className="input" name="title" required defaultValue={m?.title || ""} /></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={m?.status || "Rascunho"}>{MOD_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={m?.description || ""} /></div>
      <FileUpload name="cover_path" bucket="metodo" folder="capas" accept="image/*" current={m?.cover_path} label="Capa do módulo" />
      <div className="field"><label>Cor (se não tiver capa)</label><input className="input" type="color" name="color" defaultValue={m?.color || "#E6007E"} /></div>
      <div><button className="btn btn-primary btn-sm">{m ? "Salvar módulo" : "Criar módulo"}</button></div></form>
  );
  const LessonForm = ({ l, moduleId }: { l?: any; moduleId: string }) => (
    <form action={saveLesson} className="form-grid">{l ? <H n="id" v={l.id} /> : null}<H n="module_id" v={moduleId} /><H n="product_id" v={pid} />
      <div className="field"><label>Título</label><input className="input" name="title" required defaultValue={l?.title || ""} /></div>
      <div className="field"><label>Tipo</label><select className="input" name="type" defaultValue={l?.type || "Vídeo"}>{LESSON_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={l?.status || "Rascunho"}>{LESSON_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Duração</label><input className="input" name="duration" placeholder="12 min" defaultValue={l?.duration || ""} /></div>
      <div className="field full"><label>Link do vídeo (Panda Video, YouTube não listado, Vimeo ou Bunny)</label><input className="input" name="video_url" type="url" placeholder="https://" defaultValue={l?.video_url || ""} /></div>
      <FileUpload name="video_path" bucket="metodo" folder="videos" accept="video/*" current={l?.video_path} label="Ou arquivo de vídeo (até 50 MB)" />
      <FileUpload name="pdf_path" bucket="metodo" folder="materiais" current={l?.pdf_path} label="Material para download (PDF, ZIP, presets…)" />
      <FileUpload name="thumb_path" bucket="metodo" folder="capas" accept="image/*" current={l?.thumb_path} label="Miniatura" />
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={l?.description || ""} /></div>
      <div className="field full"><label>Exercício</label><textarea className="input" name="exercise" defaultValue={l?.exercise || ""} /></div>
      <div><button className="btn btn-primary btn-sm">{l ? "Salvar aula" : "Criar aula"}</button></div></form>
  );
  const Mv = ({ kind, id }: { kind: string; id: string }) => <span style={{ display: "inline-flex", gap: 4 }}>{[["-1", "↑"], ["1", "↓"]].map(([d, s]) => <form key={d} action={reorder}><H n="kind" v={kind} /><H n="id" v={id} /><H n="dir" v={d} /><H n="product_id" v={pid} /><button className="btn btn-ghost btn-sm" aria-label={d === "-1" ? "Subir" : "Descer"}>{s}</button></form>)}</span>;
  return (
    <>
      <PageH eyebrow="Club Criadora" title={prod.title} sub={`${(mods || []).length} módulos · ${(lessons || []).length} aulas (${visible.length} publicadas) · ${new Set(paid.map((p: any) => p.creator_id)).size} alunas`} right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}><Link className="btn btn-ghost btn-sm" href="/club/admin">Todos os produtos</Link><Link className="btn btn-ghost btn-sm" href={`/club/${prod.slug}`}>Ver como aluna</Link><Pill s={prod.status} /></div>} />
      <Notice q={q} />
      <div className="tabs">{[["conteudo", "Conteúdo"], ["alunas", "Alunas"], ["produto", "Produto e venda"]].map(([k, l]) => <Link key={k} className={`tab ${tab === k ? "on" : ""}`} href={`/club/admin/${pid}?tab=${k}`}>{l}</Link>)}</div>

      {tab === "conteudo" ? <>
        <details className="mod"><summary>+ Novo módulo</summary><div style={{ paddingBottom: 16 }}><ModForm /></div></details>
        {(mods || []).length ? (mods || []).map((m: any) => { const ls = (lessons || []).filter((l: any) => l.module_id === m.id); return (
          <div className="card" key={m.id}>
            <div className="card-h" style={{ flexWrap: "wrap", gap: 8 }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ width: 14, height: 40, borderRadius: 4, background: m.color || "#E6007E" }} /><div><h2>{m.title}</h2><span className="small muted">{ls.length} aulas · {ls.filter((l: any) => l.status === "Publicada").length} publicadas</span></div></div><div className="actions" style={{ alignItems: "center" }}><Pill s={m.status} /><Mv kind="module" id={m.id} /><ConfirmDelete action={deleteModule} fields={{ id: m.id, product_id: pid }} warning="Apaga o módulo e todas as aulas dele. O progresso das alunas nesse conteúdo também deixa de contar." /></div></div>
            <details className="mod" style={{ marginBottom: 10 }}><summary className="small">Editar módulo</summary><div style={{ paddingBottom: 12 }}><ModForm m={m} /></div></details>
            {ls.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Aula</th><th>Tipo</th><th>Duração</th><th>Arquivos</th><th>Status</th><th></th></tr></thead><tbody>
              {ls.map((l: any, i: number) => <tr key={l.id}><td className="num">{i + 1}</td><td><b>{l.title}</b><details className="mod" style={{ marginTop: 6 }}><summary className="small">Editar</summary><div style={{ paddingBottom: 12 }}><LessonForm l={l} moduleId={m.id} /></div></details></td><td className="small">{l.type}</td><td className="small">{l.duration || "—"}</td><td className="small">{[l.video_url || l.video_path ? "vídeo" : "", l.pdf_path ? "download" : "", l.thumb_path ? "miniatura" : ""].filter(Boolean).join(" · ") || "—"}</td><td><Pill s={l.status} /></td><td><div className="actions"><Mv kind="lesson" id={l.id} /><ConfirmDelete action={deleteLesson} fields={{ id: l.id, product_id: pid }} warning="Apaga a aula." /></div></td></tr>)}
            </tbody></table></div> : <p className="muted small">Nenhuma aula neste módulo ainda.</p>}
            <details className="mod" style={{ marginTop: 10 }}><summary>+ Nova aula em {m.title}</summary><div style={{ paddingBottom: 14 }}><LessonForm moduleId={m.id} /></div></details>
          </div>); }) : <Empty icon="book" title="Comece criando o primeiro módulo" text="Depois adicione as aulas com vídeo, arquivos para download e exercício. Só o que estiver Publicado aparece para as alunas." />}
      </> : null}

      {tab === "alunas" ? <>
        <div className="kpis"><Kpi k="Alunas" v={new Set(paid.map((p: any) => p.creator_id)).size} hero /><Kpi k="Checkouts aguardando" v={pending.length} /><Kpi k="Aulas publicadas" v={visible.length} /><Kpi k="Concluíram" v={paid.filter((p: any) => pct(p.creator_id) >= 100).length} /></div>
        <div className="grid g2">
          <details className="mod"><summary>Liberar acesso manualmente</summary><form action={confirmPurchase} className="form-grid" style={{ paddingBottom: 14 }}><H n="product_id" v={pid} /><div className="field"><label>Creator</label><select className="input" name="creator_id" required><option value="">Escolha</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Motivo</label><select className="input" name="source"><option>Pagamento conferido na B4YOU</option><option>Cortesia</option><option>Confirmação manual</option></select></div><div className="field"><label>Valor pago (R$)</label><input placeholder="0,00" className="input" type="text" inputMode="decimal" name="value" /></div><div style={{ alignSelf: "end" }}><button className="btn btn-primary btn-sm">Liberar acesso</button></div></form></details>
          <details className="mod"><summary>Avisar alunas deste produto</summary><form action={notifyAll} className="form-grid" style={{ paddingBottom: 14 }}><H n="product_id" v={pid} /><div className="field"><label>Tipo de aviso</label><select className="input" name="kind">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div><div className="field"><label>Complemento (opcional)</label><input className="input" name="extra" /></div><div><button className="btn btn-dark btn-sm">Enviar</button></div></form></details>
        </div>
        {pending.length ? <div className="card"><div className="card-h"><h2>Checkouts iniciados, aguardando confirmação</h2><span className="small muted">o acesso só é liberado quando o pagamento é confirmado</span></div><div className="list">{pending.map((p: any) => <div className="li" key={p.id}><div className="grow"><Person name={p.creators?.name || "Creator"} sub={`${p.email || p.creators?.email || ""} · ${fd(String(p.created_at).slice(0, 10))}`} /></div><form action={confirmPurchase}><H n="id" v={p.id} /><H n="product_id" v={pid} /><H n="source" v="Pagamento conferido na B4YOU" /><button className="btn btn-ok btn-sm">Confirmar pagamento</button></form></div>)}</div></div> : null}
        <div className="chips">{STAGES.map(([k, l]) => <Link key={k} className={`chip ${sf === k ? "on" : ""}`} href={`/club/admin/${pid}?tab=alunas&f=${k}`}>{l}</Link>)}</div>
        <div className="card">{students.length ? <div className="table-wrap"><table><thead><tr><th>Aluna</th><th>Compra</th><th>Progresso</th><th className="r">Aulas</th><th>Última atividade</th><th>Etapa</th><th></th></tr></thead><tbody>
          {students.map((p: any) => { const v = pct(p.creator_id), la = myProg(p.creator_id).map((x: any) => x.done_at).sort().pop(); return <tr key={p.id}><td><Person name={p.creators?.name || "Creator"} sub={p.creators?.instagram || ""} /></td><td className="small">{fd(String(p.paid_at || p.created_at).slice(0, 10))}<div className="muted">{p.source}{p.value ? ` · ${brl(p.value)}` : ""}</div></td><td style={{ minWidth: 140 }}><span className="small num">{v}%</span><div className="bar"><i style={{ width: `${v}%` }} /></div></td><td className="r num">{myProg(p.creator_id).length}/{visible.length}</td><td className="small">{la ? fd(String(la).slice(0, 10)) : "—"}</td><td><Pill s={stage(v)} /></td><td><ConfirmDelete action={revokePurchase} fields={{ id: p.id, product_id: pid }} label="Retirar acesso" warning="Marca a compra como reembolsada e retira o acesso a este produto." /></td></tr>; })}
        </tbody></table></div> : <Empty icon="users" title="Nenhuma aluna nesta etapa" text="Alunas aparecem aqui quando o pagamento é confirmado." />}</div>
      </> : null}

      {tab === "produto" ? <><div className="card"><ProductForm p={prod} /></div>{profile.role === "ceo" ? <ConfirmDelete action={deleteProduct} fields={{ id: pid }} label="Excluir produto" warning="Apaga o produto, os módulos, as aulas e as compras registradas. Prefira deixar Oculto se só quiser tirar da vitrine." /> : null}</> : null}
    </>
  );
}
