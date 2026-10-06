import { cookies } from "next/headers";
import { accessEmail, emailEnabled, sendEmail, type AccessKind } from "./email";

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

// Envia o link por e-mail (se o e-mail estiver ativado) e guarda o link por 15 minutos
// só para quem o gerou ver na tela (para mandar também pelo WhatsApp).
export async function showLink(email: string, name: string, link: string, kind: AccessKind = "geral") {
  let emailed = false;
  if (emailEnabled()) { const m = accessEmail(kind, name, link); emailed = await sendEmail(email, m.subject, m.html); }
  (await cookies()).set("cx_link", JSON.stringify({ email, name, link, emailed, on: emailEnabled() }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });
  return emailed;
}
