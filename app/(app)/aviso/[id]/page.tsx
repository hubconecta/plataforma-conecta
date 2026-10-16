import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PageH } from "@/components/ui";

export default async function Aviso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getSession();
  if (!profile) redirect("/login");
  const { data: a } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  await supabase.from("announcement_recipients").update({ read_at: new Date().toISOString() }).eq("announcement_id", id).eq("profile_id", profile.id).is("read_at", null);
  const ext = a.button_url && !a.button_url.startsWith("/");
  return (
    <>
      <PageH eyebrow="📢 Aviso da Conecta" title={a.title} sub={new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })} right={<Link className="btn btn-ghost btn-sm" href="/avisos">Todos os avisos</Link>} />
      <div className="card ann-pin">
        {a.body ? <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{a.body}</p> : null}
        {a.button_url ? <div style={{ marginTop: 14 }}><a className="btn btn-primary" href={a.button_url} target={ext ? "_blank" : undefined} rel="noopener noreferrer">{a.button_label || "Abrir"}</a></div> : null}
      </div>
    </>
  );
}
