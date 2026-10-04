import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Notice, fd } from "@/components/ui";
import ShipmentForm from "../ShipmentForm";

// Dados de envio: acessível à equipe de logística e à marca dona do envio. Ver o endereço registra no histórico.
export default async function Envio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await getSession();
  if (!profile) redirect("/login");
  const staff = can(profile, "amostras") || can(profile, "presskits");
  if (!staff && profile.role !== "marca") redirect("/");
  const { data: s } = await supabase.from("shipments").select("*, creators(name,instagram,whatsapp), brands(name), campaigns(name), pk_orders(press_kits(name))").eq("id", id).single();
  if (!s) notFound();
  const { data: addr } = await supabase.rpc("shipment_address", { s: id });
  const a = Array.isArray(addr) ? addr[0] : addr;
  const ctx = s.campaigns?.name ? `Campanha ${s.campaigns.name}` : s.pk_orders?.press_kits?.name ? `Press kit ${s.pk_orders.press_kits.name}` : "Envio avulso";
  const backPath = `/envios/${id}`;
  return (
    <>
      <PageH eyebrow={`${s.brands?.name || "Conecta"} · ${ctx}`} title={`${s.product} · ${s.qty} un.`} right={<div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Link className="btn btn-ghost btn-sm" href={staff ? "/envios" : "/portal/envios"}>Voltar</Link><Pill s={s.status} /></div>} />
      <Notice q={q} />
      <div className="grid g2">
        <div className="card"><div className="card-h"><h2>Dados de envio</h2><span className="small muted">acesso registrado</span></div>
          {s.status === "Cancelado" ? <p className="muted">Endereço indisponível: não há autorização logística ativa para este envio.</p>
            : a ? <dl className="dl"><div><dt>Destinatária</dt><dd>{a.recipient || s.creators?.name}</dd></div><div><dt>Telefone</dt><dd>{a.phone || s.creators?.whatsapp || "—"}</dd></div><div style={{ gridColumn: "1 / -1" }}><dt>Endereço</dt><dd>{a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ""}<br />{a.district} · {a.city}/{a.state} · CEP {a.zip}</dd></div></dl>
            : <p className="muted">A creator ainda não cadastrou o endereço. Ela é avisada para completar o perfil no Clube.</p>}
        </div>
        <div className="card"><div className="card-h"><h2>Envio</h2></div><dl className="dl"><div><dt>Creator</dt><dd>{s.creators?.name}</dd></div><div><dt>Motivo</dt><dd>{s.reason || "—"}</dd></div><div><dt>Autorizado em</dt><dd>{fd(String(s.approved_at || s.created_at).slice(0, 10))}</dd></div><div><dt>Rastreio</dt><dd>{s.tracking || "—"}</dd></div><div><dt>Enviado</dt><dd>{fd(s.sent_at)}</dd></div><div><dt>Entregue</dt><dd>{fd(s.delivered_at)}</dd></div></dl></div>
      </div>
      {s.status !== "Cancelado" || staff ? <div className="card"><div className="card-h"><h2>Atualizar envio</h2></div><ShipmentForm s={s} staff={staff} backPath={backPath} /></div> : null}
    </>
  );
}
