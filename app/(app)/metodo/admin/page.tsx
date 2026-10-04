import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, Kpi, Person, fd, brl } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import ConfirmDelete from "@/components/ConfirmDelete";
import CopyText from "@/components/CopyText";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOD_STATUS, LESSON_STATUS, LESSON_TYPES } from "@/lib/consts";
import { saveModule, deleteModule, saveLesson, deleteLesson, reorder, notifyAll, confirmPurchase, revokePurchase, saveMetodoSettings, resolveEvent } from "../actions";

const KINDS = ["📚 Nova aula disponível", "🆕 Novo módulo liberado", "📎 Material novo", "🔥 Desafio novo", "Atualização do Método", "⏰ Lembrete de estudo"];
const STAGES: [string, string][] = [["todas", "Todas"], ["nao", "Não iniciou"], ["andamento", "Em andamento"], ["quase", "Quase concluído"], ["concluido", "Concluído"]];

export default async function MetodoAdmin({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("metodo_adm");
  const ceo = profile.role === "ceo";
  const tab = ["conteudo", "alunas", "vendas"].includes(q.tab) ? q.tab : "conteudo";
  const [{ data: mods }, { data: lessons }, { data: purchases }, { data: progress }, { data: creators }, { data: cfgM }] = await Promise.all([
    supabase.from("method_modules").select("*").order("position").order("created_at"),
    supabase.from("method_lessons").select("*").order("position").order("created_at"),
    supabase.from("method_purchases").select("*, creators(name,instagram,email)").order("created_at", { ascending: false }),
    supabase.from("method_progress").select("creator_id,lesson_id,done_at"),
    supabase.from("creators").select("id,name,email").order("name"),
    supabase.from("settings").select("value").eq("key", "metodo").maybeSingle(),
  ]);
  const visible = (lessons || []).filter((l: any) => l.status === "Publicada" && (mods || []).find((m: any) => m.id === l.module_id)?.status === "Publicado");
  const visIds = new Set(visible.map((l: any) => l.id));
  const paid = (purchases || []).filter((p: any) => p.status === "Pago");
  const pending = (purchases || []).filter((p: any) => p.status === "Aguardando pagamento");
  const pct = (cid: string) => visible.length ? Math.round(((progress || []).filter((p: any) => p.creator_id === cid && visIds.has(p.lesson_id)).length / visible.length) * 100) : 0;
  const lastAct = (cid: string) => (progress || []).filter((p: any) => p.creator_id === cid).map((p: any) => p.done_at).sort().pop();
  const stage = (p: number) => p === 0 ? "Não iniciou" : p >= 100 ? "Concluído" : p >= 75 ? "Quase concluído" : "Em andamento";
  const sf = STAGES.some((s) => s[0] === q.f) ? q.f : "todas";
  const students = [...new Map(paid.map((p: any) => [p.creator_id, p])).values()].filter((p: any) => { const s = stage(pct(p.creator_id)); return sf === "todas" || (sf === "nao" && s === "Não iniciou") || (sf === "andamento" && s === "Em andamento") || (sf === "quase" && s === "Quase concluído") || (sf === "concluido" && s === "Concluído"); });
  let b4: any = null, events: any[] = [];
  if (tab === "vendas") {
    const admin = createAdminClient();
    if (ceo) { const { data } = await admin.from("settings").select("value").eq("key", "b4you").maybeSingle(); b4 = data?.value || {}; }
    const { data: ev } = await supabase.from("b4_events").select("*").order("created_at", { ascending: false }).limit(50);
    events = ev || [];
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const hook = b4?.token ? `${site}/api/integracoes/b4you/webhook?token=${b4.token}` : "";
  const ModForm = ({ m }: { m?: any }) => (
    <form action={saveModule} className="form-grid">{m ? <input type="hidden" name="id" value={m.id} /> : null}
      <div className="field"><label>Nome do módulo</label><input className="input" name="title" required defaultValue={m?.title || ""} /></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={m?.status || "Rascunho"}>{MOD_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={m?.description || ""} /></div>
      <FileUpload name="cover_path" bucket="metodo" folder="capas" accept="image/*" current={m?.cover_path} label="Capa do módulo (imagem vertical ou 16:9)" />
      <div className="field"><label>Cor (se não tiver capa)</label><input className="input" type="color" name="color" defaultValue={m?.color || "#E6007E"} /></div>
      <div><button className="btn btn-primary btn-sm">{m ? "Salvar módulo" : "Criar módulo"}</button></div></form>
  );
  const LessonForm = ({ l, moduleId }: { l?: any; moduleId: string }) => (
    <form action={saveLesson} className="form-grid">{l ? <input type="hidden" name="id" value={l.id} /> : null}<input type="hidden" name="module_id" value={moduleId} />
      <div className="field"><label>Título da aula</label><input className="input" name="title" required defaultValue={l?.title || ""} /></div>
      <div className="field"><label>Tipo</label><select className="input" name="type" defaultValue={l?.type || "Vídeo"}>{LESSON_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Status</label><select className="input" name="status" defaultValue={l?.status || "Rascunho"}>{LESSON_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="field"><label>Duração</label><input className="input" name="duration" placeholder="12 min" defaultValue={l?.duration || ""} /></div>
      <div className="field full"><label>Link do vídeo (Panda Video, YouTube não listado, Vimeo ou Bunny)</label><input className="input" name="video_url" type="url" placeholder="https://" defaultValue={l?.video_url || ""} /><span className="small muted">Recomendado para vídeos longos. Ou envie o arquivo abaixo (até 50 MB).</span></div>
      <FileUpload name="video_path" bucket="metodo" folder="videos" accept="video/*" current={l?.video_path} label="Arquivo de vídeo (opcional)" />
      <FileUpload name="pdf_path" bucket="metodo" folder="materiais" accept=".pdf,application/pdf" current={l?.pdf_path} label="Material em PDF" />
      <FileUpload name="thumb_path" bucket="metodo" folder="capas" accept="image/*" current={l?.thumb_path} label="Miniatura da aula" />
      <div className="field full"><label>Descrição</label><textarea className="input" name="description" defaultValue={l?.description || ""} /></div>
      <div className="field full"><label>Exercício</label><textarea className="input" name="exercise" defaultValue={l?.exercise || ""} /></div>
      <div><button className="btn btn-primary btn-sm">{l ? "Salvar aula" : "Criar aula"}</button></div></form>
  );
  const Mv = ({ kind, id }: { kind: string; id: string }) => <span style={{ display: "inline-flex", gap: 4 }}>{[["-1", "↑"], ["1", "↓"]].map(([d, s]) => <form key={d} action={reorder}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value={d} /><button className="btn btn-ghost btn-sm" aria-label={d === "-1" ? "Subir" : "Descer"}>{s}</button></form>)}</span>;
  return (
    <>
      <PageH eyebrow="Educação" title="Método Criadora Expert" sub={`${(mods || []).length} módulos · ${(lessons || []).length} aulas (${visible.length} publicadas) · ${new Set(paid.map((p: any) => p.creator_id)).size} alunas`} />
      <Notice q={q} />
      <div className="tabs">{[["conteudo", "Conteúdo"], ["alunas", "Alunas do Método"], ["vendas", "Vendas e integração"]].map(([k, l]) => <Link key={k} className={`tab ${tab === k ? "on" : ""}`} href={`/metodo/admin?tab=${k}`}>{l}</Link>)}</div>

      {tab === "conteudo" ? <>
        <details className="mod"><summary>+ Novo módulo</summary><div style={{ paddingBottom: 16 }}><ModForm /></div></details>
        {(mods || []).length ? (mods || []).map((m: any) => { const ls = (lessons || []).filter((l: any) => l.module_id === m.id); return (
          <div className="card" key={m.id} id={`m-${m.id}`}>
            <div className="card-h" style={{ flexWrap: "wrap", gap: 8 }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ width: 14, height: 40, borderRadius: 4, background: m.color || "#E6007E" }} /><div><h2>{m.title}</h2><span className="small muted">{ls.length} aulas · {ls.filter((l: any) => l.status === "Publicada").length} publicadas</span></div></div><div className="actions" style={{ alignItems: "center" }}><Pill s={m.status} /><Mv kind="module" id={m.id} /><ConfirmDelete action={deleteModule} fields={{ id: m.id }} warning="Apaga o módulo e todas as aulas dele. O progresso das alunas nesse conteúdo também deixa de contar." /></div></div>
            <details className="mod" style={{ marginBottom: 10 }}><summary className="small">Editar módulo</summary><div style={{ paddingBottom: 12 }}><ModForm m={m} /></div></details>
            {ls.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Aula</th><th>Tipo</th><th>Duração</th><th>Arquivos</th><th>Status</th><th></th></tr></thead><tbody>
              {ls.map((l: any, i: number) => <tr key={l.id}><td className="num">{i + 1}</td><td><b>{l.title}</b><details className="mod" style={{ marginTop: 6 }}><summary className="small">Editar</summary><div style={{ paddingBottom: 12 }}><LessonForm l={l} moduleId={m.id} /></div></details></td><td className="small">{l.type}</td><td className="small">{l.duration || "—"}</td><td className="small">{[l.video_url || l.video_path ? "vídeo" : "", l.pdf_path ? "PDF" : "", l.thumb_path ? "miniatura" : ""].filter(Boolean).join(" · ") || "—"}</td><td><Pill s={l.status} /></td><td><div className="actions"><Mv kind="lesson" id={l.id} /><ConfirmDelete action={deleteLesson} fields={{ id: l.id }} warning="Apaga a aula." /></div></td></tr>)}
            </tbody></table></div> : <p className="muted small">Nenhuma aula neste módulo ainda.</p>}
            <details className="mod" style={{ marginTop: 10 }}><summary>+ Nova aula em {m.title}</summary><div style={{ paddingBottom: 14 }}><LessonForm moduleId={m.id} /></div></details>
          </div>); }) : <Empty icon="book" title="Comece criando o primeiro módulo" text="Depois adicione as aulas com vídeo, PDF e exercício. Só o que estiver Publicado aparece para as alunas." />}
      </> : null}

      {tab === "alunas" ? <>
        <div className="kpis"><Kpi k="Alunas" v={new Set(paid.map((p: any) => p.creator_id)).size} hero /><Kpi k="Checkouts aguardando" v={pending.length} /><Kpi k="Aulas publicadas" v={visible.length} /><Kpi k="Concluíram" v={paid.filter((p: any) => pct(p.creator_id) >= 100).length} /></div>
        <div className="grid g2">
          <details className="mod"><summary>Liberar acesso manualmente</summary><form action={confirmPurchase} className="form-grid" style={{ paddingBottom: 14 }}><div className="field"><label>Creator</label><select className="input" name="creator_id" required><option value="">Escolha</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Motivo</label><select className="input" name="source"><option>Pagamento conferido na B4YOU</option><option>Cortesia</option><option>Confirmação manual</option></select></div><div className="field"><label>Valor pago (R$)</label><input className="input" type="number" step="0.01" name="value" /></div><div style={{ alignSelf: "end" }}><button className="btn btn-primary btn-sm">Liberar acesso</button></div></form></details>
          <details className="mod"><summary>Avisar alunas</summary><form action={notifyAll} className="form-grid" style={{ paddingBottom: 14 }}><div className="field"><label>Tipo de aviso</label><select className="input" name="kind">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div><div className="field"><label>Complemento (opcional)</label><input className="input" name="extra" /></div><div><button className="btn btn-dark btn-sm">Enviar para todas as alunas</button></div></form></details>
        </div>
        {pending.length ? <div className="card"><div className="card-h"><h2>Checkouts iniciados, aguardando confirmação</h2><span className="small muted">o acesso só é liberado quando a B4YOU confirma o pagamento</span></div><div className="list">{pending.map((p: any) => <div className="li" key={p.id}><div className="grow"><Person name={p.creators?.name || "Creator"} sub={`${p.email || p.creators?.email || ""} · ${fd(String(p.created_at).slice(0, 10))}`} /></div><form action={confirmPurchase}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="source" value="Pagamento conferido na B4YOU" /><button className="btn btn-ok btn-sm">Confirmar pagamento</button></form></div>)}</div></div> : null}
        <div className="chips">{STAGES.map(([k, l]) => <Link key={k} className={`chip ${sf === k ? "on" : ""}`} href={`/metodo/admin?tab=alunas&f=${k}`}>{l}</Link>)}</div>
        <div className="card">{students.length ? <div className="table-wrap"><table><thead><tr><th>Aluna</th><th>Compra</th><th>Progresso</th><th className="r">Aulas</th><th>Última atividade</th><th>Etapa</th><th></th></tr></thead><tbody>
          {students.map((p: any) => { const v = pct(p.creator_id), la = lastAct(p.creator_id); return <tr key={p.id}><td><Person name={p.creators?.name || "Creator"} sub={p.creators?.instagram || ""} /></td><td className="small">{fd(String(p.paid_at || p.created_at).slice(0, 10))}<div className="muted">{p.source}{p.value ? ` · ${brl(p.value)}` : ""}</div></td><td style={{ minWidth: 140 }}><span className="small num">{v}%</span><div className="bar"><i style={{ width: `${v}%` }} /></div></td><td className="r num">{(progress || []).filter((x: any) => x.creator_id === p.creator_id && visIds.has(x.lesson_id)).length}/{visible.length}</td><td className="small">{la ? fd(String(la).slice(0, 10)) : "—"}</td><td><Pill s={stage(v)} /></td><td><ConfirmDelete action={revokePurchase} fields={{ id: p.id, status: "Reembolsado" }} label="Retirar acesso" warning="Marca a compra como reembolsada e retira o acesso ao Método." /></td></tr>; })}
        </tbody></table></div> : <Empty icon="users" title="Nenhuma aluna nesta etapa" text="Alunas aparecem aqui quando o pagamento é confirmado." />}</div>
      </> : null}

      {tab === "vendas" ? <>
        <div className="card"><div className="card-h"><h2>Checkout e B4YOU</h2></div>
          {ceo ? <form action={saveMetodoSettings} className="form-grid">
            <div className="field full"><label>Link do checkout da B4YOU (botão QUERO ACESSAR)</label><input className="input" name="checkout" type="url" placeholder="https://" defaultValue={cfgM?.value?.checkout || ""} /></div>
            <div className="field"><label>Preço exibido (R$)</label><input className="input" type="number" step="0.01" name="price" defaultValue={cfgM?.value?.price || ""} /></div>
            <div className="field"><label>ID ou nome do produto do Método na B4YOU</label><input className="input" name="metodo_product" defaultValue={b4?.metodo_product || ""} placeholder="como aparece na B4YOU" /></div>
            <label className="check full"><input type="checkbox" name="new_token" /> Gerar um novo endereço secreto do webhook (o antigo para de funcionar)</label>
            <div><button className="btn btn-primary btn-sm">Salvar</button></div>
          </form> : <p className="muted">Só a CEO altera o checkout e a integração. Link atual: {cfgM?.value?.checkout || "não configurado"}</p>}
          {ceo && hook ? <div style={{ marginTop: 14 }}><span className="lbl">Endereço do webhook (cole na B4YOU em Apps → Webhooks, marcando os eventos de compra aprovada e reembolso)</span><div className="inline-form" style={{ marginTop: 6 }}><input className="input" readOnly value={hook} style={{ flex: 1 }} /><CopyText text={hook} label="Copiar" /></div><p className="small muted" style={{ marginTop: 6 }}>Este endereço é secreto: não compartilhe. O acesso é liberado automaticamente quando o pagamento for aprovado, o produto for o do Método e o e-mail da compra for o mesmo do cadastro da creator. Se algo não bater, o evento fica em “Para revisar” abaixo.</p></div> : ceo ? <p className="small muted" style={{ marginTop: 10 }}>Clique em Salvar uma vez para gerar o endereço do webhook.</p> : null}
        </div>
        <div className="card"><div className="card-h"><h2>Eventos recebidos da B4YOU</h2></div>{events.length ? <div className="list">{events.map((e: any) => <div className="li" key={e.id} style={{ flexWrap: "wrap", alignItems: "flex-start" }}><div className="grow"><b>{e.event || "Evento"} · {e.product || "produto ?"}</b><span>{e.email || "sem e-mail"} · {e.value ? brl(e.value) : ""} · {new Date(e.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>{e.note ? <span>{e.note}</span> : null}</div><Pill s={e.status === "Processado" ? "Aprovado" : e.status === "Para revisar" ? "Em análise" : e.status} />
          {e.status === "Para revisar" ? <form action={resolveEvent} className="inline-form" style={{ width: "100%" }}><input type="hidden" name="id" value={e.id} /><select className="input" name="creator_id" style={{ maxWidth: 260 }}><option value="">Liberar o Método para…</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}</select><button className="btn btn-ok btn-sm" name="do" value="liberar">Liberar</button><button className="btn btn-ghost btn-sm" name="do" value="ignorar">Ignorar</button></form> : null}
          <details style={{ width: "100%" }}><summary className="small muted">Ver dados recebidos</summary><pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(e.payload, null, 2)}</pre></details></div>)}</div> : <Empty icon="plug" title="Nenhum evento recebido ainda" text="Depois de configurar o webhook na B4YOU, faça uma compra de teste: o evento aparece aqui." />}</div>
      </> : null}
    </>
  );
}
