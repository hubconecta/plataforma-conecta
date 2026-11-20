import Link from "next/link";
import { requireModule } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageH, Empty, Notice, fd } from "@/components/ui";
import { hubSettings, hasAccess } from "@/lib/hub";
import { brl2 } from "@/lib/hub-areas";
import { grantHub, revokeHub } from "../actions";

const KIND: Record<string, string> = { pagamento: "💎 Pagamento aprovado", renovacao: "🔁 Renovação", atraso: "⚠️ Pagamento em atraso", cancelamento: "❌ Cancelamento", reembolso: "↩️ Reembolso/estorno", expiracao: "⏸️ Expirou", pendente: "⏳ Aguardando pagamento", manual_liberar: "🎁 Liberado pela equipe", manual_retirar: "🚫 Retirado pela equipe", lembrete: "🔔 Lembrete enviado", duplicado: "♻️ Aviso repetido (ignorado)", desconhecido: "❔ Aviso não reconhecido" };
const ST: Record<string, string> = { ativa: "Ativa", em_atraso: "Em atraso", cancelada: "Cancelada", pendente: "Pendente", expirada: "Expirada", reembolsada: "Reembolsada" };
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—");

export default async function AssinaturaCreator({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  await requireModule("assinaturas");
  const admin = createAdminClient();
  const cfg = await hubSettings(admin);
  const [{ data: cr }, { data: sub }] = await Promise.all([
    admin.from("creators").select("id,name,email,instagram,brand_only").eq("id", id).maybeSingle(),
    admin.from("subscriptions").select("*").eq("creator_id", id).eq("plan_code", "hub").maybeSingle(),
  ]);
  if (!cr) return (<><PageH title="Assinatura" /><div className="card"><Empty icon="user" title="Creator não encontrada" /></div></>);
  const [{ data: evs }, { data: who }] = await Promise.all([
    admin.from("subscription_events").select("*").eq("creator_id", id).order("created_at", { ascending: false }).limit(100),
    admin.from("profiles").select("id,name").in("role", ["ceo", "equipe", "financeiro"]),
  ]);
  const W = new Map((who || []).map((p: any) => [p.id, p.name]));
  const access = hasAccess(sub, cfg.grace_days);
  const here = `/assinaturas/${id}`;
  return (
    <>
      <PageH eyebrow={<Link href="/assinaturas?tab=assinantes">← Conecta Hub · assinantes</Link>} title={cr.name} sub={[cr.email, cr.instagram].filter(Boolean).join(" · ")} right={<Link className="btn btn-ghost btn-sm" href={`/creators/${id}`}>Ver creator</Link>} />
      <Notice q={q} />
      <div className="card"><div className="card-h"><h2>Assinatura</h2><span className={`pill ${access ? "ok" : "neutral"}`}>{access ? "Com acesso ao Hub" : "Sem acesso (Free)"}</span></div>
        {sub ? <dl className="dl">
          <div><dt>Status</dt><dd>{ST[sub.status] || sub.status}{sub.manual ? " · liberada pela equipe" : ""}</dd></div>
          <div><dt>Início</dt><dd>{dt(sub.started_at)}</dd></div>
          <div><dt>Período pago até</dt><dd>{dt(sub.current_period_end)}</dd></div>
          {sub.grace_until ? <><div><dt>Carência até</dt><dd>{dt(sub.grace_until)}</dd></div></> : null}
          {sub.canceled_at ? <><div><dt>Cancelada em</dt><dd>{dt(sub.canceled_at)}</dd></div></> : null}
          <div><dt>Último pagamento</dt><dd>{sub.last_payment_at ? `${dt(sub.last_payment_at)} · ${brl2(sub.last_amount || 0)}` : "—"}</dd></div>
          <div><dt>E-mail no checkout</dt><dd>{sub.email || "—"}</dd></div>
          <div><dt>Código na B4YOU</dt><dd>{sub.provider_ref || "—"}</dd></div>
          {sub.note ? <><div><dt>Observação</dt><dd>{sub.note}</dd></div></> : null}
        </dl> : <p className="small muted">Creator Free: ainda não iniciou a assinatura.</p>}
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card"><div className="card-h"><h2>🎁 Liberar / estender</h2></div>
          <form action={grantHub} className="form-grid"><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="back" value={here} />
            <div className="field full"><label htmlFor="gu">Acesso até (em branco = 1 mês a partir de hoje)</label><input className="input" type="date" id="gu" name="until" /></div>
            <div className="field full"><label htmlFor="gr">Motivo</label><input className="input" id="gr" name="reason" required maxLength={300} /></div>
            <div className="full"><button className="btn btn-primary btn-sm">Liberar acesso</button></div></form></div>
        <div className="card"><div className="card-h"><h2>🚫 Retirar acesso</h2></div>
          {sub ? <form action={revokeHub} className="form-grid"><input type="hidden" name="creator_id" value={id} /><input type="hidden" name="back" value={here} />
            <div className="field full"><label htmlFor="rr">Motivo</label><input className="input" id="rr" name="reason" required maxLength={300} /></div>
            <p className="small muted full">O acesso termina agora. Isso não cancela a cobrança na B4YOU: se ela continuar pagando, a próxima renovação libera de novo. Para parar a cobrança, cancele também na B4YOU.</p>
            <div className="full"><button className="btn btn-bad btn-sm">Retirar acesso</button></div></form> : <p className="small muted">Sem assinatura para retirar.</p>}</div>
      </div>
      <div className="card" style={{ marginTop: 14 }}><div className="card-h"><h2>Histórico</h2></div>
        {evs?.length ? <div className="list">{evs.map((e: any) => <div className="li" key={e.id}><div className="grow"><b>{KIND[e.kind] || e.kind}{e.amount ? ` · ${brl2(e.amount)}` : ""}</b><span>{dt(e.created_at)}{e.by_profile ? ` · por ${W.get(e.by_profile) || "equipe"}` : e.b4_event_id ? " · B4YOU" : " · sistema"}</span>{e.note ? <span className="small muted">{e.note}</span> : null}</div></div>)}</div>
          : <p className="small muted">Nenhum evento ainda.</p>}</div>
    </>
  );
}
