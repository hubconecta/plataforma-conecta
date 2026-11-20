import Link from "next/link";
import { requireModule } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { Notice, fd } from "@/components/ui";
import Icon from "@/components/Icon";
import { HUB_AREAS, HUB_EXTRA, brl2 } from "@/lib/hub-areas";
import { hubSettings } from "@/lib/hub";
import { startHubCheckout } from "./actions";

const ST: Record<string, string> = { ativa: "Ativa", em_atraso: "Pagamento em atraso", cancelada: "Cancelada (acesso até o fim do período)", pendente: "Aguardando pagamento", expirada: "Expirada", reembolsada: "Reembolsada" };
const d = (s?: string | null) => (s ? fd(String(s).slice(0, 10)) : "—");

export default async function HubPage({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("hub");
  const hub = !!(profile as any).hub;
  const cfg = await hubSettings(createAdminClient());
  const [{ data: subRows }, { data: teasers }] = await Promise.all([supabase.rpc("my_subscription"), supabase.rpc("hub_teasers")]);
  const sub: any = (subRows || [])[0] || null;
  const T = new Map<string, number>((teasers || []).map((t: any) => [t.area, Number(t.total)]));
  const count = (slug: string) => T.get(slug === "academy" ? "aulas" : slug) || 0;
  const waiting = !hub && (q?.retorno || sub?.status === "pendente");

  if (hub) {
    const { data: pins } = await supabase.from("hub_items").select("id,section,title,body,url,kind").eq("status", "Publicado").eq("pinned", true).order("created_at", { ascending: false }).limit(6);
    return (
      <>
        <Notice q={q} />
        <section className="hub-hero">
          <span className="hub-mark"><i />Conecta Hub · assinante</span>
          <h1>Meu <em>Hub</em></h1>
          <p className="lead">Oi, {String(profile.name || "").split(" ")[0] || "creator"}! Tudo o que é exclusivo para você está aqui.</p>
        </section>
        <div className="card hub-status" style={{ marginTop: 16 }}>
          <div><span className="eyebrow">Minha assinatura</span><h2 style={{ margin: "2px 0" }}>{ST[sub?.status] || "Ativa"}{sub?.manual ? " · liberada pela equipe" : ""}</h2>
            <span className="small muted">
              {sub?.status === "em_atraso" ? `Atualize o pagamento na B4YOU até ${d(sub.grace_until)} para não perder o acesso.`
                : sub?.status === "cancelada" ? `Você continua com acesso até ${d(sub.current_period_end)}.`
                : sub?.current_period_end ? `${sub?.manual ? "Acesso liberado" : "Próxima renovação"} até ${d(sub.current_period_end)} · ${brl2(cfg.price)}/mês` : `${brl2(cfg.price)}/mês`}
            </span></div>
          {sub?.status === "em_atraso" && cfg.checkout_url ? <a className="btn hub-cta" href={cfg.checkout_url}>Atualizar pagamento</a> : null}
          {sub?.status === "cancelada" ? <form action={startHubCheckout}><button className="btn btn-primary">Voltar a assinar</button></form> : null}
        </div>
        {pins?.length ? <div className="hub-sec"><h2>📌 Em destaque</h2><div className="hub-items">{pins.map((p: any) => (
          <Link key={p.id} href={`/hub/${p.section}`} className="hub-item pin" style={{ textDecoration: "none", color: "inherit" }}><span className="eyebrow">{p.kind}</span><b>{p.title}</b>{p.body ? <p className="muted">{String(p.body).slice(0, 140)}</p> : null}</Link>))}</div></div> : null}
        <div className="hub-sec"><h2>Suas áreas exclusivas</h2>
          <div className="hub-areas">{HUB_AREAS.map((a) => (
            <Link key={a.key} href={`/hub/${a.slug}`} className="hub-area"><span className="em">{a.emoji}</span><b>{a.title}</b><span>{a.desc}</span>{count(a.slug) ? <span className="n">{count(a.slug)} disponível(is)</span> : null}</Link>))}</div>
        </div>
        <p className="small muted" style={{ marginTop: 18 }}>A cobrança é mensal e recorrente pela B4YOU. Para cancelar ou trocar o cartão, use o link que chegou no seu e-mail da B4YOU ou fale com a equipe Conecta. Se cancelar, o acesso continua até o fim do período já pago.</p>
      </>
    );
  }

  return (
    <>
      <Notice q={q} />
      {waiting ? <div className="notice info" role="status" style={{ marginBottom: 14 }}>⏳ <b>Estamos aguardando a confirmação do pagamento pela B4YOU.</b> Assim que for aprovado, o Conecta Hub é liberado aqui na sua conta automaticamente e você recebe uma notificação. (Pix e cartão costumam levar poucos minutos; boleto pode levar até 3 dias úteis.)</div> : null}
      {sub && ["expirada", "reembolsada"].includes(sub.status) ? <div className="notice info" style={{ marginBottom: 14 }}>Sua assinatura do Conecta Hub está {ST[sub.status].toLowerCase()}. Assine de novo para voltar a ter acesso às áreas exclusivas.</div> : null}
      <section className="hub-hero">
        <span className="hub-mark"><i />Conecta Hub</span>
        <h1>CONECTA <em>HUB</em></h1>
        <p className="lead">Seu próximo nível como creator começa aqui.</p>
        <p>O Conecta Hub é o espaço exclusivo para creators que querem ampliar suas oportunidades, aprender, se conectar com marcas e desenvolver sua presença no digital.</p>
        <p>Dentro do Hub, você terá acesso a campanhas exclusivas, oportunidades, comunidade, conteúdos, aulas, desafios e recursos pensados para ajudar você a evoluir como creator.</p>
        <a href="#assinar" className="btn hub-cta">QUERO FAZER PARTE DO CONECTA HUB</a>
      </section>

      <div className="hub-sec"><h2>Benefícios do Conecta Hub</h2>
        <div className="hub-areas">
          {HUB_AREAS.map((a) => (
            <Link key={a.key} href={`/hub/${a.slug}`} className="hub-area locked"><span className="lk" title="Exclusivo do Conecta Hub"><Icon name="lock" /></span><span className="em">{a.emoji}</span><b>{a.title}</b><span>{a.desc}</span>{count(a.slug) ? <span className="n">{count(a.slug)} esperando por você</span> : null}</Link>))}
          <div className="hub-area"><span className="em">{HUB_EXTRA.emoji}</span><b>{HUB_EXTRA.title}</b><span>{HUB_EXTRA.desc}</span></div>
        </div>
      </div>

      <div className="hub-sec" id="assinar"><div className="hub-price">
        <div className="p-l"><span className="eyebrow">O que você leva</span><h2 style={{ margin: "4px 0 0" }}>Tudo do Hub, numa assinatura só</h2>
          <ul>{HUB_AREAS.map((a) => <li key={a.key}>{a.title}</li>)}<li>Novidades que entrarem no Hub</li></ul></div>
        <div className="p-r">
          <span className="hub-mark"><i />Assinatura mensal</span>
          <div className="val">{brl2(cfg.price)}<small>/mês</small></div>
          <p className="fine">Assinatura recorrente: a cobrança se renova sozinha todo mês. Cancele quando quiser; o acesso continua até o fim do período pago.</p>
          <form action={startHubCheckout} style={{ width: "100%" }}><button className="btn hub-cta" style={{ width: "100%" }}>QUERO FAZER PARTE DO CONECTA HUB</button></form>
          <p className="fine">Pagamento seguro pela B4YOU. Use o mesmo e-mail da sua conta Conecta ({profile.email}) para o acesso ser liberado automaticamente.</p>
        </div>
      </div></div>

      <div className="hub-sec"><h2>Perguntas frequentes</h2>
        <div className="faq">
          <details><summary>Quando meu acesso é liberado?</summary><p>Assim que a B4YOU confirmar o pagamento. A liberação é automática, na sua conta de sempre (você não precisa criar outro cadastro).</p></details>
          <details><summary>Como funciona a cobrança?</summary><p>É uma assinatura mensal de {brl2(cfg.price)}, renovada automaticamente todo mês pela B4YOU.</p></details>
          <details><summary>E se o pagamento da renovação falhar?</summary><p>Você recebe um aviso e tem {cfg.grace_days} dias para regularizar sem perder o acesso.</p></details>
          <details><summary>Posso cancelar?</summary><p>Pode, quando quiser. O acesso às áreas exclusivas continua até o fim do período que você já pagou.</p></details>
          <details><summary>Continuo no Clube Conecta se não assinar?</summary><p>Sim! Você continua como Creator Free, com acesso ao Clube, às oportunidades abertas e às suas campanhas.</p></details>
        </div>
      </div>
    </>
  );
}
