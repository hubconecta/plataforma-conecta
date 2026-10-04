import { createClient } from "@/lib/supabase/server";
import PublicForm from "./PublicForm";

export default async function FormPublico({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: form } = await supabase.from("forms").select("id,title,description,fields,status").eq("slug", slug).eq("status", "Publicado").maybeSingle();
  const { data: u } = await supabase.auth.getUser();
  let creatorId: string | null = null;
  if (u.user) { const { data: p } = await supabase.from("profiles").select("creator_id,role").eq("id", u.user.id).single(); if (p?.role === "creator") creatorId = p.creator_id; }
  const top = <div className="signup-top"><div><div className="logo-crop" style={{ ["--w" as any]: "150px" }}><img src="/logo-conecta.png" alt="Conecta" /></div></div></div>;
  if (!form) return <>{top}<div className="signup"><div className="empty"><h3>Formulário indisponível</h3><p>Este formulário foi encerrado ou ainda não foi publicado.</p></div></div></>;
  return <>{top}<PublicForm form={form} creatorId={creatorId} /></>;
}
