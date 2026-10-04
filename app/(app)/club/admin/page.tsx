import Link from "next/link";
import { requireModule } from "@/lib/session";
import { PageH, Pill, Empty, Notice, brl } from "@/components/ui";
import CopyText from "@/components/CopyText";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductForm from "../ProductForm";
import { moveProduct, saveB4Settings, resolveEvent, reprocessEvent, reprocessAll } from "../actions";

export default async function ClubAdmin({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("metodo_adm");
  const ceo = profile.role === "ceo";
  const [{ data: prods }, { data: buys }, { data: events }, { data: creators }] = await Promise.all([
    supabase.from("products").select("*").order("position").order("created_at"),
    supabase.from("method_purchases").select("product_id,status"),
    supabase.from("b4_events").select("*").order("created_at", { ascending: false }).limit(40),
    supabase.from("creators").select("id,name,email").order("name"),
  ]);
  let token = "";
  if (ceo) { const { data } = await createAdminClient().from("settings").select("value").eq("key", "b4you").maybeSingle(); token = data?.value?.token || ""; }
  const hook = token ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/integracoes/b4you/webhook?token=${token}` : "";
  const n = (pid: string, st: string) => (buys || []).filter((b: any) => b.product_id === pid && b.status === st).length;
  return (
    <>
      <PageH eyebrow="Educação" title="Club Criadora" sub="Seus produtos digitais. A creator vê todos na vitrine: os que comprou abrem a área de membros, os outros aparecem com cadeado e botão de compra." right={<Link className="btn btn-ghost btn-sm" href="/club">Ver vitrine</Link>} />
      <Notice q={q} />
      <details className="mod"><summary>+ Novo produto</summary><div style={{ paddingBottom: 16 }}><ProductForm /></div></details>
      {prods?.length ? <div className="card"><div className="table-wrap"><table><thead><tr><th>Ordem</th><th>Produto</th><th className="r">Preço</th><th className="r">Alunas</th><th className="r">Checkouts</th><th>Checkout</th><th>Status</th><th></th></tr></thead><tbody>
        {prods.map((p: any, i: number) => <tr key={p.id}><td><span style={{ display: "inline-flex", gap: 4 }}>{[["-1", "↑"], ["1", "↓"]].map(([d, s]) => <form key={d} action={moveProduct}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value={d} /><button className="btn btn-ghost btn-sm" aria-label={d === "-1" ? "Subir" : "Descer"}>{s}</button></form>)}</span> <span className="small muted">{i + 1}º</span></td><td><Link href={`/club/admin/${p.id}`}><b>{p.title}</b></Link><div className="small muted">/club/{p.slug}</div></td><td className="r num">{p.price ? brl(p.price) : "—"}</td><td className="r num">{n(p.id, "Pago")}</td><td className="r num">{n(p.id, "Aguardando pagamento")}</td><td className="small">{p.checkout_url ? "configurado" : <span style={{ color: "var(--warn)" }}>falta o link</span>}</td><td><Pill s={p.status} /></td><td><Link className="btn btn-dark btn-sm" href={`/club/admin/${p.id}`}>Gerenciar</Link></td></tr>)}
      </tbody></table></div></div> : <Empty icon="book" title="Nenhum produto ainda" text="Crie o primeiro produto do Club Criadora." />}
      <div className="card"><div className="card-h"><h2>Integração B4YOU</h2></div>
        {ceo ? <>{hook ? <><span className="lbl">Endereço do webhook (um só para todos os produtos). Cadastre na B4YOU em Apps → Webhooks, marcando compra aprovada e reembolso.</span><div className="inline-form" style={{ marginTop: 6 }}><input className="input" readOnly value={hook} style={{ flex: 1 }} /><CopyText text={hook} label="Copiar" /></div></> : null}
          <form action={saveB4Settings} className="inline-form" style={{ marginTop: 10 }}>{hook ? <label className="check small"><input type="checkbox" name="new_token" /> Gerar novo endereço (o antigo para de funcionar)</label> : null}<button className="btn btn-dark btn-sm">{hook ? "Atualizar" : "Gerar endereço do webhook"}</button></form>
          <p className="small muted" style={{ marginTop: 8 }}>O acesso é liberado sozinho quando o pagamento é aprovado, o produto bate com o “ID ou nome na B4YOU” de um dos produtos e o e-mail da compra é o mesmo do cadastro da creator. Se algo não bater, o evento fica “Para revisar” abaixo.</p></> : <p className="muted">Só a CEO vê o endereço secreto do webhook.</p>}
      </div>
      <div className="card"><div className="card-h"><h2>Eventos recebidos da B4YOU</h2>{(events || []).some((e: any) => e.status === "Para revisar") ? <form action={reprocessAll}><button className="btn btn-dark btn-sm">Reprocessar todos “Para revisar”</button></form> : null}</div>{events?.length ? <div className="list">{events.map((e: any) => <div className="li" key={e.id} style={{ flexWrap: "wrap", alignItems: "flex-start" }}><div className="grow"><b>{e.event || "Evento"} · {e.product || "produto ?"}</b><span>{e.email || "sem e-mail"}{e.value ? ` · ${brl(e.value)}` : ""} · {new Date(e.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>{e.note ? <span>{e.note}</span> : null}</div><Pill s={e.status === "Processado" ? "Aprovado" : e.status === "Para revisar" ? "Em análise" : e.status} />
        {e.status === "Para revisar" ? <form action={resolveEvent} className="inline-form" style={{ width: "100%" }}><input type="hidden" name="id" value={e.id} /><select className="input" name="product_id" style={{ maxWidth: 220 }}><option value="">Produto…</option>{(prods || []).map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select><select className="input" name="creator_id" style={{ maxWidth: 260 }}><option value="">Creator…</option>{(creators || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}</select><button className="btn btn-ok btn-sm" name="do" value="liberar">Liberar</button><button className="btn btn-ghost btn-sm" name="do" value="ignorar">Ignorar</button></form> : null}
        {e.status !== "Ignorado" ? <form action={reprocessEvent}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm">Reprocessar</button></form> : null}
        <details style={{ width: "100%" }}><summary className="small muted">Ver dados recebidos</summary><pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(e.payload, null, 2)}</pre></details></div>)}</div> : <Empty icon="plug" title="Nenhum evento recebido ainda" text="Depois de cadastrar o webhook na B4YOU, faça uma compra de teste: o evento aparece aqui." />}</div>
    </>
  );
}
