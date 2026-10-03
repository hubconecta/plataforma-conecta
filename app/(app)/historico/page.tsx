import { requireModule } from "@/lib/session";
import { PageH, Empty } from "@/components/ui";

export default async function Historico() {
  const { supabase } = await requireModule("auditoria");
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
  return (
    <>
      <PageH eyebrow="Segurança" title="Histórico de ações" sub="Quem fez, o quê, quando e em qual módulo." />
      <div className="card">{data?.length ? <div className="list">{data.map((a: any) => <div className="li" key={a.id}><div className="grow"><b style={{ fontWeight: 600 }}><span style={{ fontWeight: 800 }}>{a.who}</span> {a.action}</b><span>{new Date(a.created_at).toLocaleString("pt-BR")}</span></div>{a.module ? <span className="tag">{a.module}</span> : null}</div>)}</div> : <Empty icon="shield" title="Nenhuma ação registrada ainda" />}</div>
    </>
  );
}
