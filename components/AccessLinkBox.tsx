import { cookies } from "next/headers";
import CopyLink from "./CopyLink";
import { dismissLink } from "@/app/(app)/actions";

export default async function AccessLinkBox() {
  const raw = (await cookies()).get("cx_link")?.value;
  if (!raw) return null;
  let d: { email: string; name: string; link: string };
  try { d = JSON.parse(raw); } catch { return null; }
  const text = `Oi${d.name ? ", " + d.name.split(" ")[0] : ""}! Seu acesso à plataforma Conecta está pronto 💗 Clique no link para criar sua senha (vale por tempo limitado e só pode ser usado uma vez):`;
  return (
    <div className="card" style={{ padding: 18, marginBottom: 18, border: "1px solid var(--pink, #e83e8c)" }}>
      <strong>Link de primeiro acesso para {d.name || d.email}</strong>
      <p className="muted" style={{ margin: "6px 0 12px" }}>Envie este link para <b>{d.email}</b>. Ele é pessoal, funciona uma vez só e aparece aqui por 15 minutos. Não compartilhe com outras pessoas.</p>
      <CopyLink link={d.link} text={text} />
      <form action={dismissLink} style={{ marginTop: 10 }}><button className="btn btn-ghost btn-sm">Já enviei, fechar</button></form>
    </div>
  );
}
