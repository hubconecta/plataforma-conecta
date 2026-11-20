import Link from "next/link";
import { requireModule } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageH, Kpi, Empty, Notice, fd } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { hubSettings, hasAccess } from "@/lib/hub";
import { brl2 } from "@/lib/hub-areas";
import { saveHubSettings, grantHub, saveHubItem, deleteHubItem, resolveHubEvent, reprocessHubEvents, launchHub, pauseHub, saveHubGroup, deleteHubGroup } from "./actions";

const ST_LABEL: Record<string, string> = { ativa: "Ativa", em_atraso: "Em atraso", cancelada: "Cancelada", pendente: "Pendente", expirada: "Expirada", reembolsada: "Reembolsada" };
const ST_CLS: Record<string, string> = { ativa: "ok", em_atraso: "warn", cancelada: "bad", pendente: "info", expirada: "neutral", reembolsada: "bad" };
const SECTIONS: [string, string][] = [["tiktok", "TikTok Shop"], ["instagram", "Instagram"], ["comunidade", "Comunidade"], ["materiais", "Materiais"]];
const KINDS = ["Oportunidade", "Conteúdo", "Material", "Link", "Aviso", "Produto", "Vídeo"];
const d = (s?: string | null) => (s ? fd(String(s).slice(0, 10)) : "—");

export default async function Assinaturas({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase } = await requireModule("assinaturas");
  const tab = ["visao", "assinantes", "avisos", "conteudos", "config"].includes(q.tab) ? q.tab : "visao";
  const admin = createAdminClient();
  const cfg = await hubSettings(admin);
  const [{ data: subs, error }, { data: creators }] = await Promise.all([
    admin.from("subscriptions").select("*, creators(name,email,instagram)").eq("plan_code", "hub").order("updated_at", { ascending: false }),
    admin.from("creators").select("id,name,email").order("name"),
  ]);
  const head = <><PageH eyebrow="Monetização" title="💎 Conecta Hub" sub={`Assinatura mensal das creators · ${brl2(cfg.price)}/mês · carência de ${cfg.grace_days} dia(s) no atraso`} />
    {cfg.launched ? null : <div className="notice info" style={{ marginBottom: 14 }}>🧪 <b>Modo teste.</b> O Conecta Hub está escondido das creators: ninguém recebe notificação nem vê o menu. Só as creators de teste ({(cfg.testers || []).length}) enxergam e conseguem assinar. Quando estiver tudo certo, use <Link href="/assinaturas?tab=config">Configurações › Lançar</Link>.</div>}</>;
  if (error) return (<>{head}<div className="card"><Empty icon="alert" title="Falta rodar o SQL do Conecta Hub" text="Rode o arquivo supabase/23_conecta_hub.sql no SQL Editor do Supabase e recarregue esta página." /></div></>);

  const all = subs || [];
  const now = Date.now(), m0 = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7), d30 = now - 30 * 864e5;
  const withAccess = all.filter((s: any) => hasAccess(s, cfg.grace_days));
  const paying = withAccess.filter((s: any) => !s.manual);
  const k = {
    ativas: withAccess.length,
    novas: all.filter((s: any) => s.started_at && String(s.started_at).slice(0, 7) === m0 && s.status !== "pendente").length,
    pendentes: all.filter((s: any) => s.status === "pendente").length,
    atraso: all.filter((s: any) => s.status === "em_atraso").length,
    canceladas: all.filter((s: any) => s.status === "cancelada" || (s.canceled_at && new Date(s.canceled_at).getTime() > d30)).length,
    mrr: paying.reduce((t: number, s: any) => t + Number(s.last_amount || cfg.price), 0),
  };
  const { data: churnEv } = await admin.from("subscription_events").select("creator_id").in("kind", ["expiracao", "reembolso", "manual_retirar"]).gte("created_at", new Date(d30).toISOString());
  const churned = new Set((churnEv || []).map((e: any) => e.creator_id)).size;
  const churn = k.ativas + churned ? Math.round((churned / (k.ativas + churned)) * 1000) / 10 : 0;

  const tabs = <div className="tabs">{[["visao", "Visão geral"], ["assinantes", `Assinantes (${all.length})`], ["avisos", "Avisos da B4YOU"], ["conteudos", "Conteúdos do Hub"], ["config", "Configurações"]].map(([t, l]) => <Link key={t} className={`tab ${tab === t ? "on" : ""}`} href={`/assinaturas?tab=${t}`}>{l}</Link>)}</div>;
  const Row = ({ s }: { s: any }) => (
    <Link href={`/assinaturas/${s.creator_id}`} className="li" style={{ textDecoration: "none", color: "inherit", flexWrap: "wrap" }}>
      <div className="grow"><b>{s.creators?.name || s.email}</b><span>{s.creators?.email || s.email}{s.manual ? " · liberada pela equipe" : ""}</span>
        <span className="small muted">{s.status === "em_atraso" ? `Carência até ${d(s.grace_until)}` : s.status === "cancelada" ? `Acesso até ${d(s.current_period_end)}` : s.current_period_end ? `Período até ${d(s.current_period_end)}` : `Desde ${d(s.created_at)}`}{s.last_payment_at ? ` · último pagamento ${d(s.last_payment_at)}` : ""}</span></div>
      <span className={`pill ${ST_CLS[s.status] || ""}`}>{ST_LABEL[s.status] || s.status}{hasAccess(s, cfg.grace_days) ? "" : s.status === "pendente" ? "" : " · sem acesso"}</span>
    </Link>);

  let body: React.ReactNode = null;
  if (tab === "visao") {
    const attention = all.filter((s: any) => s.status === "em_atraso" || s.status === "pendente").slice(0, 10);
    body = (<>
      <div className="kpis">
        <Kpi k="Assinantes com acesso" v={k.ativas} hero />
        <Kpi k="Receita mensal (MRR)" v={brl2(k.mrr)} />
        <Kpi k="Novas no mês" v={k.novas} />
        <Kpi k="Pendentes" v={k.pendentes} />
        <Kpi k="Em atraso" v={k.atraso} />
        <Kpi k="Canceladas (30 dias)" v={k.canceladas} />
        <Kpi k="Churn (30 dias)" v={`${churn}%`} />
      </div>
      {!cfg.b4you_product || !cfg.checkout_url ? <div className="notice info" style={{ marginTop: 14 }}>⚙️ Para começar a vender: cadastre o produto de assinatura na B4YOU e preencha o <b>link do checkout</b> e o <b>ID do produto</b> em <Link href="/assinaturas?tab=config">Configurações</Link>.</div> : null}
      <div className="card" style={{ marginTop: 14 }}><div className="card-h"><h2>Precisam de atenção</h2></div>
        {attention.length ? <div className="list">{attention.map((s: any) => <Row key={s.id} s={s} />)}</div> : <p className="small muted">Nenhuma assinatura pendente ou em atraso.</p>}</div>
    </>);
  }
  if (tab === "assinantes") {
    const f = ST_LABEL[q.s] ? q.s : "";
    const shown = f ? all.filter((s: any) => s.status === f) : all;
    body = (<>
      <div className="chips" style={{ marginBottom: 12 }}>{[["", "Todas"], ...Object.entries(ST_LABEL)].map(([v, l]) => <Link key={v} className={`chip ${f === v ? "on" : ""}`} href={`/assinaturas?tab=assinantes${v ? `&s=${v}` : ""}`}>{l} ({v ? all.filter((s: any) => s.status === v).length : all.length})</Link>)}</div>
      <div className="card">{shown.length ? <div className="list">{shown.map((s: any) => <Row key={s.id} s={s} />)}</div> : <Empty icon="sparkle" title="Nenhuma assinatura aqui" text="As assinaturas aparecem assim que a creator inicia o checkout ou a B4YOU confirma o pagamento." />}</div>
      <div className="card" style={{ marginTop: 14 }}><div className="card-h"><h2>Liberar acesso manualmente</h2></div>
        <p className="small muted">Para cortesias, parcerias ou correções. Fica registrado com o seu nome e o motivo.</p>
        <form action={grantHub} className="form-grid">
          <div className="field"><label htmlFor="g_cr">Creator</label><select className="input" id="g_cr" name="creator_id" required defaultValue=""><option value="" disabled>Escolha…</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}</select></div>
          <div className="field"><label htmlFor="g_un">Acesso até (em branco = 1 mês)</label><input className="input" type="date" id="g_un" name="until" /></div>
          <div className="field full"><label htmlFor="g_re">Motivo</label><input className="input" id="g_re" name="reason" required maxLength={300} placeholder="Ex.: cortesia de parceria, pagamento feito por Pix direto…" /></div>
          <div className="full"><button className="btn btn-primary">Liberar Conecta Hub</button></div>
        </form></div>
    </>);
  }
  if (tab === "avisos") {
    const { data: evs } = await admin.from("b4_events").select("id,created_at,status,note,email,value,event,product,creator_id").eq("product", "Conecta Hub").order("created_at", { ascending: false }).limit(60);
    const review = (evs || []).filter((e: any) => e.status === "Para revisar");
    body = (<>
      <div className="card"><div className="card-h"><h2>Para revisar ({review.length})</h2>{review.length ? <form action={reprocessHubEvents}><button className="btn btn-ghost btn-sm">Tentar de novo</button></form> : null}</div>
        <p className="small muted">Pagamentos do Conecta Hub em que não achamos a creator pelo e-mail. Escolha a creator: o acesso é liberado na conta que ela já tem.</p>
        {review.length ? <div className="list">{review.map((e: any) => (
          <div className="li" key={e.id} style={{ flexWrap: "wrap" }}><div className="grow"><b>{e.email || "sem e-mail"}{e.value ? ` · ${brl2(e.value)}` : ""}</b><span>{new Date(e.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {e.event || ""}</span><span className="small muted">{e.note}</span></div>
            <form action={resolveHubEvent} className="inline-form"><input type="hidden" name="id" value={e.id} /><select className="input" name="creator_id" defaultValue="" aria-label="Creator"><option value="">Escolha a creator…</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}</select><button className="btn btn-primary btn-sm">Aplicar</button><button className="btn btn-ghost btn-sm" name="do" value="ignorar">Ignorar</button></form></div>))}</div>
          : <p className="small muted">Nada para revisar. 💖</p>}</div>
      <div className="card" style={{ marginTop: 14 }}><div className="card-h"><h2>Últimos avisos do Conecta Hub</h2></div>
        {evs?.length ? <div className="list">{evs.map((e: any) => <div className="li" key={e.id}><div className="grow"><b>{e.email || "—"}{e.value ? ` · ${brl2(e.value)}` : ""}</b><span>{new Date(e.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {e.event || ""}</span><span className="small muted">{e.note}</span></div><span className="pill neutral">{e.status}</span></div>)}</div>
          : <Empty icon="plug" title="Nenhum aviso ainda" text="Os avisos chegam pelo mesmo webhook da B4YOU usado no Club Criadora." />}</div>
    </>);
  }
  if (tab === "conteudos") {
    const { data: hubGroups } = await admin.from("community_links").select("id,title,url").eq("audience", "Hub").order("position").order("created_at");
    const { data: items } = await supabase.from("hub_items").select("*").order("section").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    const Form = ({ i }: { i?: any }) => (
      <form action={saveHubItem} className="form-grid">{i ? <input type="hidden" name="id" value={i.id} /> : null}
        <div className="field"><label>Área</label><select className="input" name="section" defaultValue={i?.section || "tiktok"}>{SECTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Tipo</label><select className="input" name="kind" defaultValue={i?.kind || "Conteúdo"}>{KINDS.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="field full"><label>Título</label><input className="input" name="title" required maxLength={160} defaultValue={i?.title || ""} /></div>
        <div className="field full"><label>Texto</label><textarea className="input" name="body" defaultValue={i?.body || ""} /></div>
        <div className="field"><label>Link (vídeo, arquivo no Drive, grupo, produto…)</label><input className="input" name="url" defaultValue={i?.url || ""} placeholder="https://…" /></div>
        <div className="field"><label>Categoria (opcional, agrupa na página)</label><input className="input" name="category" maxLength={80} defaultValue={i?.category || ""} placeholder="Ex.: Produtos em alta" /></div>
        <div className="field"><label>Status</label><select className="input" name="status" defaultValue={i?.status || "Publicado"}><option>Publicado</option><option>Rascunho</option></select></div>
        <label className="perm"><input type="checkbox" name="pinned" defaultChecked={!!i?.pinned} />Destacar no topo e no “Meu Hub”</label>
        {i ? null : <label className="perm"><input type="checkbox" name="notify" defaultChecked />Avisar as assinantes</label>}
        <div className="full"><button className="btn btn-primary">{i ? "Salvar" : "Publicar"}</button></div>
      </form>);
    body = (<>
      <div className="card" style={{ marginBottom: 14 }}><div className="card-h"><h2>💬 Grupos exclusivos das assinantes</h2></div>
        <p className="small muted">O link aparece só para quem assina o Conecta Hub (em Meu Hub › Comunidade e nos grupos do início). As Free não veem o link, nem pela API.</p>
        {hubGroups?.length ? <div className="list" style={{ marginBottom: 12 }}>{hubGroups.map((l: any) => <div className="li" key={l.id}><div className="grow"><b>{l.title}</b><span className="small muted">{l.url}</span></div><ConfirmDelete action={deleteHubGroup} fields={{ id: l.id }} label="Remover" warning="O grupo deixa de aparecer para as assinantes (o grupo no WhatsApp continua existindo)." /></div>)}</div> : null}
        <form action={saveHubGroup} className="form-grid">
          <div className="field"><label htmlFor="hg_t">Nome do grupo</label><input className="input" id="hg_t" name="title" maxLength={120} placeholder="Ex.: Comunidade Conecta Hub" /></div>
          <div className="field"><label htmlFor="hg_u">Link do grupo</label><input className="input" id="hg_u" name="url" required placeholder="https://chat.whatsapp.com/…" /></div>
          <div className="full"><button className="btn btn-primary">Adicionar grupo exclusivo</button></div>
        </form></div>
      <div className="card"><div className="card-h"><h2>Novo conteúdo exclusivo</h2></div><p className="small muted">Campanhas, desafios e aulas exclusivas são marcadas no próprio cadastro (“Quem pode ver: Exclusivo Conecta Hub”). Grupos exclusivos: Configurações › Grupos da comunidade, com “Só assinantes do Conecta Hub”. A Conecta Academy é montada no Club Criadora (produto “Conecta Academy”).</p><Form /></div>
      {SECTIONS.map(([sec, label]) => { const list = (items || []).filter((i: any) => i.section === sec); return (
        <div className="card" key={sec} style={{ marginTop: 14 }}><div className="card-h"><h2>{label} ({list.length})</h2></div>
          {list.length ? <div className="list">{list.map((i: any) => <details key={i.id} className="li" style={{ display: "block" }}><summary style={{ cursor: "pointer" }}><b>{i.pinned ? "📌 " : ""}{i.title}</b> <span className="small muted">· {i.kind}{i.category ? ` · ${i.category}` : ""} · {i.status}</span></summary><div style={{ marginTop: 10 }}><Form i={i} /><div style={{ marginTop: 8 }}><ConfirmDelete action={deleteHubItem} fields={{ id: i.id }} label="Apagar" warning="O conteúdo some do Conecta Hub." /></div></div></details>)}</div> : <p className="small muted">Nada publicado nesta área.</p>}</div>); })}
    </>);
  }
  if (tab === "config") {
    body = (<>
      <div className="card"><div className="card-h"><h2>Assinatura na B4YOU</h2></div>
        <form action={saveHubSettings} className="form-grid">
          <div className="field"><label htmlFor="h_pr">Valor mensal (R$)</label><input className="input" id="h_pr" name="price" inputMode="decimal" defaultValue={Number(cfg.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /></div>
          <div className="field"><label htmlFor="h_gd">Dias de carência no atraso</label><input className="input" id="h_gd" name="grace_days" type="number" min={0} max={30} defaultValue={cfg.grace_days} /><span className="small muted">Quantos dias a creator mantém o acesso depois que a renovação falha.</span></div>
          <div className="field full"><label htmlFor="h_ck">Link do checkout da assinatura (B4YOU)</label><input className="input" id="h_ck" name="checkout_url" defaultValue={cfg.checkout_url} placeholder="https://…" /></div>
          <div className="field full"><label htmlFor="h_id">ID do produto/oferta de assinatura na B4YOU</label><input className="input" id="h_id" name="b4you_product" defaultValue={cfg.b4you_product} placeholder="Copie o ID do produto na B4YOU" /><span className="small muted">É como reconhecemos que o aviso do webhook é do Conecta Hub. Use o mesmo endereço de webhook do Club Criadora e marque, na B4YOU, os eventos de assinatura (aprovada, renovada, atrasada/recusada, cancelada e reembolso).</span></div>
          <div className="field full"><label htmlFor="h_ts">Creators de teste (e-mails, um por linha)</label><textarea className="input" id="h_ts" name="testers" defaultValue={(cfg.testers || []).join("\n")} placeholder={"seuemail@exemplo.com"} /><span className="small muted">No modo teste, só essas creators veem o Conecta Hub e conseguem assinar. Use o e-mail da conta de creator delas.</span></div>
          <div className="full"><button className="btn btn-primary">Salvar</button></div>
        </form></div>
      <div className="card" style={{ marginTop: 14 }}><div className="card-h"><h2>Lançamento</h2><span className={`pill ${cfg.launched ? "ok" : "info"}`}>{cfg.launched ? "Lançado para todas" : "Modo teste"}</span></div>
        <p className="small muted">Todas as creators que ainda não assinam recebem a notificação do Conecta Hub e um aviso fixado no início por 14 dias.{(cfg as any).launched_at ? ` Lançado em ${new Date((cfg as any).launched_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : ""}</p>
        {!cfg.checkout_url ? <p className="small" style={{ color: "var(--warn)" }}>Antes de lançar, preencha o link do checkout para as creators conseguirem assinar.</p> : null}
        <details className="confirm-del"><summary className="btn btn-primary">{(cfg as any).launched ? "Avisar as creators de novo" : "💎 Lançar Conecta Hub"}</summary>
          <form action={launchHub} className="confirm-box"><p className="small">O Conecta Hub aparece para todas as creators e as Free recebem a notificação agora. Confirma?</p><button className="btn btn-primary btn-sm">Sim, lançar agora</button></form></details>
        {cfg.launched ? <form action={pauseHub} style={{ marginTop: 10 }}><button className="btn btn-ghost btn-sm">Voltar para o modo teste</button></form> : null}
      </div>
    </>);
  }
  return (<>{head}<Notice q={q} />{tabs}{body}</>);
}
