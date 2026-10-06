import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Pill, Notice } from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import { signAsCreator, signAsBrand, manageContract } from "../actions";

const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

export default async function Contrato({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<any> }) {
  const { id } = await params; const q = await searchParams;
  const { supabase, profile } = await getSession();
  if (!profile) redirect("/login");
  const { data: c } = await supabase.from("contract_signatures").select("*, campaigns(name, brands(name)), creators(name)").eq("id", id).maybeSingle();
  if (!c) notFound();
  const isCreator = profile.role === "creator", isBrand = profile.role === "marca", staff = !isCreator && !isBrand && can(profile, "campanhas");
  const back = isCreator ? "/clube/minhas" : "/contratos";
  return (
    <>
      <PageH eyebrow={`Contrato · ${c.campaigns?.brands?.name || ""}`} title={c.campaigns?.name || "Contrato"} right={<div className="actions"><Pill s={c.status} /><PrintButton /><Link className="btn btn-ghost btn-sm" href={back}>Voltar</Link></div>} />
      <Notice q={q} />
      <div className="card contract">
        <h2 style={{ marginBottom: 12 }}>{c.title}</h2>
        <div className="contract-body">{c.body}</div>
        <div className="sign-grid">
          <div className="sign-box"><span className="eyebrow">Creator</span>{c.creator_signed_at ? <><b>{c.creator_name}</b><span className="small">CPF {c.creator_doc}</span><span className="small muted">Assinado eletronicamente em {dt(c.creator_signed_at)}{c.creator_ip ? ` · IP ${c.creator_ip}` : ""}</span></> : <span className="small muted">Aguardando assinatura de {c.creators?.name || "creator"}</span>}</div>
          <div className="sign-box"><span className="eyebrow">Marca · {c.campaigns?.brands?.name || ""}</span>{c.brand_signed_at ? <><b>{c.brand_signer}</b>{c.brand_signer_role ? <span className="small">{c.brand_signer_role}</span> : null}<span className="small muted">Assinado eletronicamente em {dt(c.brand_signed_at)}{c.brand_ip ? ` · IP ${c.brand_ip}` : ""}</span></> : <span className="small muted">{c.status === "Assinado" ? "Não exige assinatura da marca" : "Aguardando assinatura da marca"}</span>}</div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Documento nº {c.id} · criado em {dt(c.created_at)} · assinatura eletrônica registrada na plataforma Conecta (nome, documento, data, hora, IP e aparelho).</p>
      </div>

      {isCreator && c.status === "Aguardando creator" ? <div className="card no-print"><div className="card-h"><h2>✍️ Assinar o contrato</h2></div>
        <form action={signAsCreator} className="form-grid"><input type="hidden" name="id" value={id} />
          <div className="field"><label htmlFor="sg_n">Seu nome completo</label><input className="input" id="sg_n" name="name" required defaultValue={c.creators?.name || ""} /></div>
          <div className="field"><label htmlFor="sg_d">Seu CPF</label><input className="input" id="sg_d" name="doc" required inputMode="numeric" placeholder="000.000.000-00" /></div>
          <label className="perm full"><input type="checkbox" name="aceite" required />Li todo o contrato e concordo com as condições.</label>
          <label className="perm full"><input type="checkbox" name="imagem" required />Autorizo o uso da minha imagem, nome, voz e dos conteúdos conforme descrito no contrato.</label>
          <div><button className="btn btn-primary">Assinar contrato</button></div></form></div> : null}

      {isBrand && c.status === "Aguardando marca" ? <div className="card no-print"><div className="card-h"><h2>✍️ Assinar pela marca</h2></div>
        <form action={signAsBrand} className="form-grid"><input type="hidden" name="id" value={id} />
          <div className="field"><label htmlFor="sb_n">Nome completo de quem assina</label><input className="input" id="sb_n" name="name" required defaultValue={profile.name || ""} /></div>
          <div className="field"><label htmlFor="sb_r">Cargo</label><input className="input" id="sb_r" name="role" defaultValue={profile.cargo || ""} /></div>
          <label className="perm full"><input type="checkbox" name="aceite" required />Li o contrato e assino em nome da marca.</label>
          <div><button className="btn btn-primary">Assinar pela marca</button></div></form></div> : null}

      {staff && c.status !== "Assinado" ? <div className="actions no-print" style={{ justifyContent: "flex-start" }}>
        <form action={manageContract}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="reenviar" /><input type="hidden" name="back" value={`/contrato/${id}`} /><button className="btn btn-ghost btn-sm">Gerar de novo com o texto atual</button></form>
        {c.status !== "Cancelado" ? <form action={manageContract}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="cancelar" /><input type="hidden" name="back" value="/contratos" /><button className="btn btn-bad btn-sm">Cancelar contrato</button></form> : null}
      </div> : null}
    </>
  );
}
