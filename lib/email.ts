// Envio de e-mail pelo Resend (https://resend.com).
// Só funciona com RESEND_API_KEY configurada na Vercel; sem ela, nada é enviado
// e a plataforma continua mostrando o link para mandar pelo WhatsApp.
const esc = (s: string) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const emailEnabled = () => !!process.env.RESEND_API_KEY;

export function emailLayout(title: string, paragraphs: string[], cta?: { label: string; url: string }, foot?: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `<!doctype html><html><body style="margin:0;background:#f6f1f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#0B0B0C;padding:22px 28px">${site ? `<img src="${site}/logo-conecta.png" alt="Conecta" width="140" style="display:block;max-width:140px">` : `<b style="color:#fff;font-size:20px">Conecta</b>`}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#111">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:22px 0 8px"><a href="${cta.url}" style="display:inline-block;background:#E6007E;color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;font-size:15px">${esc(cta.label)}</a></p>
<p style="margin:10px 0 0;font-size:12px;color:#888;line-height:1.5">Se o botão não abrir, copie e cole no navegador:<br><span style="word-break:break-all">${esc(cta.url)}</span></p>` : ""}
${foot ? `<p style="margin:18px 0 0;font-size:12px;color:#888;line-height:1.5">${esc(foot)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;background:#faf6f8;font-size:12px;color:#999">Conecta · comunidade de creators e marcas${site ? ` · <a href="${site}" style="color:#E6007E">${esc(site.replace(/^https?:\/\//, ""))}</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.EMAIL_FROM || "Conecta <contato@conectainfluencia.com.br>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// E-mails de acesso (link pessoal de primeiro acesso / nova senha)
export type AccessKind = "creator_aprovada" | "creator" | "marca" | "equipe" | "geral";
export function accessEmail(kind: AccessKind, name: string, link: string) {
  const first = (name || "").split(" ")[0];
  const oi = first ? `Oi, ${first}!` : "Oi!";
  const foot = "Este link é pessoal, funciona uma vez só e vale por tempo limitado. Se ele expirar, peça um novo para a equipe Conecta.";
  if (kind === "creator_aprovada") return { subject: "Você foi aprovada no Clube Conecta! 💖", html: emailLayout("Bem-vinda ao Clube Conecta! 💖", [oi, "Seu cadastro foi aprovado e agora você faz parte da comunidade de creators da Conecta.", "No Clube você encontra oportunidades das marcas parceiras, desafios com prêmios e conteúdos exclusivos. Clique no botão para criar sua senha e entrar."], { label: "Criar minha senha e entrar", url: link }, foot) };
  if (kind === "creator") return { subject: "Seu acesso ao Clube Conecta 💖", html: emailLayout("Seu acesso ao Clube Conecta", [oi, "Aqui está o seu link para entrar no Clube Conecta. Por ele você também pode criar uma senha nova."], { label: "Entrar no Clube Conecta", url: link }, foot) };
  if (kind === "marca") return { subject: "Seu acesso ao Portal da Marca · Conecta", html: emailLayout("Seu acesso ao Portal da Marca", [oi, "A Conecta criou o acesso da sua marca. No portal você acompanha campanhas, desafios, conteúdos, envios e relatórios.", "Clique no botão para criar sua senha."], { label: "Criar senha e acessar o portal", url: link }, foot) };
  if (kind === "equipe") return { subject: "Seu acesso à plataforma Conecta", html: emailLayout("Bem-vinda à equipe Conecta", [oi, "Seu acesso à plataforma Conecta está pronto. Clique no botão para criar sua senha."], { label: "Criar senha e entrar", url: link }, foot) };
  return { subject: "Seu acesso à plataforma Conecta", html: emailLayout("Seu acesso à plataforma Conecta", [oi, "Clique no botão para entrar na plataforma e criar sua senha."], { label: "Acessar a plataforma", url: link }, foot) };
}
