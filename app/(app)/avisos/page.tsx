import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PageH, Empty, Notice, Kpi } from "@/components/ui";
import ConfirmDelete from "@/components/ConfirmDelete";
import { AUDIENCES } from "@/lib/audience";
import { emailEnabled } from "@/lib/email";
import { sendAnnouncement, deleteAnnouncement, unpinAnnouncement } from "./actions";
import AudiencePicker from "./AudiencePicker";

const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Avisos({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await getSession();
  if (!profile) redirect("/login");
  const staff = ["ceo", "equipe"].includes(profile.role);

  if (!staff) {
    const { data: rec } = await supabase.from("announcement_recipients").select("announcement_id,read_at").eq("profile_id", profile.id);
    const R = new Map((rec || []).map((r: any) => [r.announcement_id, r.read_at]));
    const { data } = (rec || []).length ? await supabase.from("announcements").select("id,title,body,created_at").in("id", [...R.keys()]).order("created_at", { ascending: false }) : { data: [] as any[] };
    return (
      <>
        <PageH eyebrow="Conecta" title="Avisos" sub="Comunicados da equipe Conecta para você." />
        <div className="card">{data?.length ? <div className="list">{data.map((a: any) => <Link key={a.id} href={`/aviso/${a.id}`} className="li" style={{ textDecoration: "none", color: "inherit" }}><div className="grow"><b>{R.get(a.id) ? "" : "🔴 "}{a.title}</b><span>{dt(a.created_at)}{a.body ? ` · ${String(a.body).slice(0, 90)}${a.body.length > 90 ? "…" : ""}` : ""}</span></div><span className="btn btn-ghost btn-sm">Ver</span></Link>)}</div> : <Empty icon="bell" title="Nenhum aviso ainda" text="Quando a Conecta mandar um comunicado, ele aparece aqui." />}</div>
      </>
    );
  }

  const [{ data: list }, { data: brands }, { data: camps }, { data: reads }] = await Promise.all([
    supabase.from("announcements").select("*, brands(name), campaigns(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("campaigns").select("id,name,brands(name)").not("status", "in", "(Recusada,Em aprovação,Ajuste solicitado)").order("created_at", { ascending: false }),
    supabase.from("announcement_recipients").select("announcement_id").not("read_at", "is", null),
  ]);
  const readCount = (id: string) => (reads || []).filter((r: any) => r.announcement_id === id).length;
  const AL = Object.fromEntries(AUDIENCES);
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const week = new Date(Date.now() - 3 * 3600e3 + 7 * 864e5).toISOString().slice(0, 10);
  return (
    <>
      <PageH eyebrow="Comunicação" title="Avisos" sub="Mande um comunicado para as creators, as marcas ou a equipe. Cada pessoa recebe a notificação (e no celular, se ativou)." />
      <Notice q={q} />
      <div className="card"><div className="card-h"><h2>📢 Novo aviso</h2></div>
        <form action={sendAnnouncement} className="form-grid">
          <AudiencePicker audiences={AUDIENCES} brands={brands || []} campaigns={(camps || []).map((c: any) => ({ id: c.id, name: `${c.name}${c.brands?.name ? ` · ${c.brands.name}` : ""}` }))} />
          <div className="field full"><label htmlFor="av_t">Título (é o que aparece na notificação)</label><input className="input" id="av_t" name="title" required maxLength={140} placeholder="Ex.: Entre no grupo da comunidade Conecta 💖" /></div>
          <div className="field full"><label htmlFor="av_b">Mensagem</label><textarea className="input" id="av_b" name="body" rows={5} placeholder="Escreva o recado completo…" /></div>
          <div className="field"><label htmlFor="av_bl">Texto do botão (opcional)</label><input className="input" id="av_bl" name="button_label" maxLength={40} placeholder="Ex.: Entrar no grupo" /></div>
          <div className="field"><label htmlFor="av_bu">Link do botão (opcional)</label><input className="input" id="av_bu" name="button_url" placeholder="https://chat.whatsapp.com/…" /></div>
          <div className="field"><label htmlFor="av_p">Fixar no início até (opcional)</label><input className="input" type="date" id="av_p" name="pinned_until" min={today} defaultValue={week} /><span className="small muted">Enquanto estiver fixado, aparece em destaque no início do Clube/Portal. Deixe em branco para não fixar.</span></div>
          <label className="perm"><input type="checkbox" name="send_email" disabled={!emailEnabled()} />Enviar também por e-mail{emailEnabled() ? " (até 95 por aviso, limite do plano grátis)" : " (e-mail não configurado)"}</label>
          <div className="full"><button className="btn btn-primary">Enviar aviso</button></div>
        </form></div>
      <div className="card"><div className="card-h"><h2>Avisos enviados</h2></div>
        {list?.length ? <div className="list">{list.map((a: any) => <div className="li" key={a.id} style={{ flexWrap: "wrap" }}>
          <div className="grow"><b>{a.title}</b><span>{dt(a.created_at)} · {AL[a.audience] || a.audience}{a.brands?.name ? ` · ${a.brands.name}` : ""}{a.campaigns?.name ? ` · ${a.campaigns.name}` : ""}</span><span className="small muted">Enviado para {a.sent_count} · {readCount(a.id)} abriram{a.emailed_count ? ` · ${a.emailed_count} e-mails` : ""}{a.pinned_until && a.pinned_until >= today ? ` · fixado até ${a.pinned_until.split("-").reverse().join("/")}` : ""}</span></div>
          <Link className="btn btn-ghost btn-sm" href={`/aviso/${a.id}`}>Ver</Link>
          {a.pinned_until && a.pinned_until >= today ? <form action={unpinAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn btn-ghost btn-sm">Desafixar</button></form> : null}
          <ConfirmDelete action={deleteAnnouncement} fields={{ id: a.id }} label="Apagar" warning="O aviso some para todo mundo (as notificações já enviadas continuam no histórico de cada pessoa)." />
        </div>)}</div> : <Empty icon="bell" title="Nenhum aviso enviado ainda" text="Use o formulário acima para mandar o primeiro." />}
      </div>
      <div className="kpis"><Kpi k="Avisos enviados" v={list?.length || 0} /></div>
    </>
  );
}
