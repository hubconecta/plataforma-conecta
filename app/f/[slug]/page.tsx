import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/storage";
import PublicForm from "./PublicForm";

export default async function FormPublico({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: form } = await supabase.from("forms").select("*").eq("slug", slug).eq("status", "Publicado").maybeSingle();
  const { data: u } = await supabase.auth.getUser();
  let loggedIn = false;
  if (u.user) { const { data: p } = await supabase.from("profiles").select("role").eq("id", u.user.id).single(); loggedIn = p?.role === "creator"; }
  let brand: { name: string; logo: string | null } | null = null;
  if (form?.brand_id) {
    try { const { data: b } = await createAdminClient().from("brands").select("name,logo_path").eq("id", form.brand_id).single(); if (b) brand = { name: b.name, logo: b.logo_path ? photoUrl(b.logo_path) : null }; } catch {}
  }
  const top = <div className="signup-top"><div><div className="logo-crop" style={{ ["--w" as any]: "150px" }}><img src="/logo-conecta.png" alt="Conecta" /></div></div></div>;
  if (!form) return <>{top}<div className="signup"><div className="empty"><h3>Formulário indisponível</h3><p>Este formulário foi encerrado ou ainda não foi publicado.</p></div></div></>;
  const safe = { id: form.id, title: form.title, description: form.description, fields: form.fields || [], brand_id: form.brand_id || null, create_access: !!form.create_access, ask_join: !!form.ask_join };
  const logo = form.logo_path ? photoUrl(form.logo_path) : brand?.logo || null;
  return <>{top}<PublicForm form={safe} brand={brand} logo={logo} loggedIn={loggedIn} /></>;
}
