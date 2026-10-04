import { cookies } from "next/headers";

// Cria (ou renova) o acesso e devolve um link seguro de primeiro acesso.
// Não depende de e-mail: a Conecta envia o link pelo WhatsApp ou e-mail próprio.
export async function accessLink(admin: any, email: string, name?: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  let type: "invite" | "recovery" = "invite";
  let { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: name ? { name } : undefined } });
  if (error) {
    type = "recovery";
    ({ data, error } = await admin.auth.admin.generateLink({ type: "recovery", email }));
  }
  if (error || !data?.properties?.hashed_token) return { error: error?.message || "não foi possível gerar o link" } as const;
  const link = `${site}/auth/entrar?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}`;
  return { user: data.user, link } as const;
}

// Guarda o link por 15 minutos só para quem o gerou ver na tela.
export async function showLink(email: string, name: string, link: string) {
  (await cookies()).set("cx_link", JSON.stringify({ email, name, link }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });
}
