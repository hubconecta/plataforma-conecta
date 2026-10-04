import Link from "next/link";
import { getSession } from "@/lib/session";
import { PageH, Empty } from "@/components/ui";
import Icon from "@/components/Icon";
import PushToggle from "@/components/PushToggle";
import { readAllNotifications } from "../actions";

export default async function Notificacoes() {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
  const unread = (data || []).filter((n: any) => !n.read_at).length;
  return (
    <>
      <PageH title="Notificações" sub={`${unread} não lidas`} right={unread ? <form action={readAllNotifications}><button className="btn btn-ghost">Marcar todas como lidas</button></form> : null} />
      <PushToggle />
      <div className="card">{data?.length ? <div className="list">{data.map((n: any) => <Link key={n.id} href={`/n/${n.id}`} prefetch={false} className="li" style={{ textDecoration: "none", color: "inherit" }}><span className={`alert-ic ${n.read_at ? "info" : "pink"}`}><Icon name="bell" /></span><span className="grow"><b style={{ fontWeight: n.read_at ? 600 : 800 }}>{n.text}</b><span>{new Date(n.created_at).toLocaleString("pt-BR")}</span></span></Link>)}</div> : <Empty icon="bell" title="Tudo em dia" text="Avisos importantes aparecem aqui." />}</div>
    </>
  );
}
