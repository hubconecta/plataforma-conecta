import { requireModule } from "@/lib/session";
import { PageH, Pill, Person, Empty, Notice, fd } from "@/components/ui";
import { setApplicationStatus, deleteApplication } from "../actions";
import ConfirmDelete from "@/components/ConfirmDelete";

const LABELS: Record<string, string> = { what: "O que faz", artist: "Nome artístico", birth: "Nascimento", cep: "CEP", niches2: "Nichos secundários", worksBrands: "Trabalha com marcas", brandTypes: "Tipos de marcas", since: "Há quanto tempo", campaigns: "Já fez campanhas", affiliates: "Já trabalhou com afiliados", soldLinks: "Já vendeu com links/cupons", yt: "YouTube", followers: "Seguidores (informado)", want: "Quer trabalhar com", avoid: "Não quer", acceptProducts: "Recebe produtos", acceptPaid: "Campanhas pagas", acceptComm: "Por comissão", acceptUgc: "UGC", events: "Eventos", eventCity: "Cidade para eventos" };

export default async function Cadastros({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("cad_creators");
  const isCeo = profile.role === "ceo";
  const { data } = await supabase.from("creator_applications").select("*").order("created_at", { ascending: false });
  const pend = (data || []).filter((a: any) => ["Nova", "Em análise"].includes(a.status));
  const done = (data || []).filter((a: any) => !["Nova", "Em análise"].includes(a.status));
  const Card = ({ a }: { a: any }) => (
    <details className="mod">
      <summary><Person name={a.name} sub={`${a.instagram || ""} · ${a.niche || ""} · ${a.city || ""}/${a.state || ""}`} /><span style={{ marginLeft: "auto" }}><Pill s={a.status} /></span></summary>
      <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <dl className="dl"><div><dt>E-mail</dt><dd>{a.email}</dd></div><div><dt>WhatsApp</dt><dd>{a.whatsapp || "—"}</dd></div><div><dt>Perfil</dt><dd>{a.kind || "—"}</dd></div><div><dt>TikTok</dt><dd>{a.tiktok || "—"}</dd></div><div><dt>Enviado em</dt><dd>{fd(a.created_at?.slice(0, 10))}</dd></div>
          {Object.entries(LABELS).map(([k, l]) => a.answers?.[k] ? <div key={k}><dt>{l}</dt><dd>{String(a.answers[k])}</dd></div> : null)}</dl>
        {["Nova", "Em análise"].includes(a.status) ? (
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <form action={setApplicationStatus} className="inline-form"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="Aprovada" /><label className="check small"><input type="checkbox" name="invite" defaultChecked /> Enviar convite para o Clube</label><button className="btn btn-primary btn-sm">Aprovar e ativar creator</button></form>
            {a.status === "Nova" ? <form action={setApplicationStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="Em análise" /><button className="btn btn-ghost btn-sm">Colocar em análise</button></form> : null}
            <form action={setApplicationStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="Rejeitada" /><button className="btn btn-bad btn-sm">Rejeitar</button></form>
          </div>) : null}
        {isCeo ? <div><ConfirmDelete action={deleteApplication} fields={{ id: a.id }} label="Excluir cadastro" warning={`Apaga o formulário enviado por ${a.name}. Se ela já foi aprovada, continua na lista de Creators.`} /></div> : null}
      </div>
    </details>
  );
  return (
    <>
      <PageH eyebrow="Pessoas" title="Cadastros de creators" sub="Quem preencheu o formulário público do Clube Conecta (link: /cadastro)." />
      <Notice q={q} />
      <h2>Pendentes ({pend.length})</h2>
      {pend.length ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{pend.map((a: any) => <Card key={a.id} a={a} />)}</div> : <Empty icon="user" title="Nenhum cadastro pendente" text="Novos cadastros aparecem aqui automaticamente, e a equipe recebe uma notificação." />}
      {done.length ? <><h2>Analisados</h2><div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{done.map((a: any) => <Card key={a.id} a={a} />)}</div></> : null}
    </>
  );
}
