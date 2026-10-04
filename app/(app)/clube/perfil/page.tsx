import { requireModule } from "@/lib/session";
import { PageH, Notice } from "@/components/ui";
import { UFS } from "@/lib/consts";
import { saveMyProfile } from "./actions";

export default async function Perfil({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("perfil");
  const [{ data: c }, { data: a }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", profile.creator_id).single(),
    supabase.from("creator_addresses").select("*").eq("creator_id", profile.creator_id).maybeSingle(),
  ]);
  const F = ({ n, l, v, t = "text", req }: { n: string; l: string; v?: any; t?: string; req?: boolean }) => <div className="field"><label htmlFor={`pf_${n}`}>{l}</label><input className="input" id={`pf_${n}`} name={n} type={t} required={req} defaultValue={v ?? ""} /></div>;
  const U = ({ n, v }: { n: string; v?: string }) => <div className="field"><label htmlFor={`pf_${n}`}>Estado</label><select className="input" id={`pf_${n}`} name={n} defaultValue={v || ""}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div>;
  return (
    <>
      <PageH eyebrow="Você" title="Meu perfil e endereço" sub={`${c?.name || ""} · ${profile.email}`} />
      <Notice q={q} />
      <form action={saveMyProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset className="fs"><legend>Perfil</legend><div className="form-grid">
          <F n="artist_name" l="Nome artístico" v={c?.artist_name} /><F n="whatsapp" l="WhatsApp" v={c?.whatsapp} t="tel" /><F n="instagram" l="Instagram" v={c?.instagram} /><F n="tiktok" l="TikTok" v={c?.tiktok} /><F n="youtube" l="YouTube" v={c?.youtube} /><F n="clothing_size" l="Tamanho de roupa" v={c?.clothing_size} /><F n="city" l="Cidade" v={c?.city} /><U n="state" v={c?.state} />
        </div></fieldset>
        <fieldset className="fs"><legend>Endereço de entrega</legend><p className="small muted">Fica protegido: só aparece para a Conecta e para a marca de um envio autorizado para você, e cada acesso fica registrado.</p><div className="form-grid">
          <F n="recipient" l="Destinatária" v={a?.recipient || c?.name} req /><F n="phone" l="Telefone para entrega" v={a?.phone || c?.whatsapp} t="tel" /><F n="zip" l="CEP" v={a?.zip} req /><F n="street" l="Rua" v={a?.street} req /><F n="number" l="Número" v={a?.number} req /><F n="complement" l="Complemento" v={a?.complement} /><F n="district" l="Bairro" v={a?.district} req /><F n="a_city" l="Cidade" v={a?.city} req /><U n="a_state" v={a?.state} />
        </div></fieldset>
        <div><button className="btn btn-primary">Salvar</button></div>
      </form>
    </>
  );
}
