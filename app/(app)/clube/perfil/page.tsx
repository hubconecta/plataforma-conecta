import { requireModule } from "@/lib/session";
import FileUpload from "@/components/FileUpload";
import ConfirmDelete from "@/components/ConfirmDelete";
import { Avatar, fd as fdate } from "@/components/ui";
import { levelOf } from "@/components/LevelBadge";
import LevelBadge from "@/components/LevelBadge";
import { signedDoc } from "@/lib/storage";
import { addCreatorFile, deleteCreatorFile } from "../../perfil/actions";
import { PageH, Notice } from "@/components/ui";
import { UFS } from "@/lib/consts";
import { saveMyProfile } from "./actions";

export default async function Perfil({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("perfil");
  const [{ data: c }, { data: a }, { data: files }, { data: levels }] = await Promise.all([
    supabase.from("creators").select("*").eq("id", profile.creator_id).single(),
    supabase.from("creator_addresses").select("*").eq("creator_id", profile.creator_id).maybeSingle(),
    supabase.from("creator_files").select("*").eq("creator_id", profile.creator_id).order("created_at", { ascending: false }),
    supabase.from("levels").select("*").order("position"),
  ]);
  const lv = levelOf(levels || [], c?.xp || 0).cur;
  const links = await Promise.all((files || []).map((f: any) => signedDoc(f.path)));
  const F = ({ n, l, v, t = "text", req }: { n: string; l: string; v?: any; t?: string; req?: boolean }) => <div className="field"><label htmlFor={`pf_${n}`}>{l}</label><input className="input" id={`pf_${n}`} name={n} type={t} required={req} defaultValue={v ?? ""} /></div>;
  const U = ({ n, v }: { n: string; v?: string }) => <div className="field"><label htmlFor={`pf_${n}`}>Estado</label><select className="input" id={`pf_${n}`} name={n} defaultValue={v || ""}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div>;
  return (
    <>
      <PageH eyebrow="Você" title="Meu perfil e endereço" sub={`${c?.name || ""} · ${profile.email}`} />
      <Notice q={q} />
      <div className="card profile-head"><Avatar name={c?.name || ""} src={c?.avatar_path} size={80} star={lv?.color} title={lv?.name} /><div><h2>{c?.artist_name || c?.name}</h2><div style={{ marginTop: 4 }}><LevelBadge level={lv} small /></div><div className="socials" style={{ marginTop: 6 }}>{c?.instagram ? <span className="tag">IG {c.instagram}</span> : null}{c?.tiktok ? <span className="tag">TikTok {c.tiktok}</span> : null}{c?.youtube ? <span className="tag">YouTube</span> : null}</div></div></div>
      <form action={saveMyProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset className="fs"><legend>Perfil</legend><div className="form-grid">
          <FileUpload name="avatar_path" bucket="perfis" folder="creators" accept="image/*" current={c?.avatar_path} label="Sua foto de perfil" />
          <div className="field full"><label htmlFor="pf_bio">Sobre você (aparece para as marcas)</label><textarea className="input" id="pf_bio" name="bio" defaultValue={c?.bio || ""} /></div>
          <F n="artist_name" l="Nome artístico" v={c?.artist_name} /><F n="whatsapp" l="WhatsApp" v={c?.whatsapp} t="tel" /><F n="instagram" l="Instagram" v={c?.instagram} /><F n="tiktok" l="TikTok" v={c?.tiktok} /><F n="followers" l="Seguidores no Instagram" v={c?.followers || ""} t="number" /><F n="tiktok_followers" l="Seguidores no TikTok" v={c?.tiktok_followers || ""} t="number" /><F n="youtube" l="YouTube" v={c?.youtube} /><F n="clothing_size" l="Tamanho de roupa" v={c?.clothing_size} /><F n="city" l="Cidade" v={c?.city} /><U n="state" v={c?.state} />
        </div></fieldset>
        <fieldset className="fs"><legend>Endereço de entrega</legend><p className="small muted">Fica protegido: só aparece para a Conecta e para a marca de um envio autorizado para você, e cada acesso fica registrado.</p><div className="form-grid">
          <F n="recipient" l="Destinatária" v={a?.recipient || c?.name} req /><F n="phone" l="Telefone para entrega" v={a?.phone || c?.whatsapp} t="tel" /><F n="zip" l="CEP" v={a?.zip} req /><F n="street" l="Rua" v={a?.street} req /><F n="number" l="Número" v={a?.number} req /><F n="complement" l="Complemento" v={a?.complement} /><F n="district" l="Bairro" v={a?.district} req /><F n="a_city" l="Cidade" v={a?.city} req /><U n="a_state" v={a?.state} />
        </div></fieldset>
        <div><button className="btn btn-primary">Salvar</button></div>
      </form>
      <div className="card"><div className="card-h"><h2>Media kit e relatórios</h2><span className="small muted">a Conecta e as marcas das suas campanhas podem ver</span></div>
        {files?.length ? <div className="list">{files.map((f: any, i: number) => <div className="li" key={f.id}><div className="grow"><b>{f.title}</b><span>{f.kind} · {fdate(String(f.created_at).slice(0, 10))}</span></div><a className="btn btn-ghost btn-sm" href={links[i]} target="_blank" rel="noopener noreferrer">Abrir</a><ConfirmDelete action={deleteCreatorFile} fields={{ id: f.id, back: "/clube/perfil" }} label="Remover" warning="O arquivo sai do seu perfil." /></div>)}</div> : <p className="muted small">Envie seu media kit e prints ou relatórios de vendas: eles ajudam a Conecta a te indicar para as marcas.</p>}
        <form action={addCreatorFile} className="form-grid" style={{ marginTop: 12 }}><input type="hidden" name="back" value="/clube/perfil" />
          <div className="field"><label>Tipo</label><select className="input" name="kind">{["Media kit", "Relatório de vendas", "Portfólio", "Outro"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <div className="field"><label>Título</label><input className="input" name="title" placeholder="Ex.: Media kit 2026" /></div>
          <FileUpload name="path" bucket="docs" folder="creators" accept=".pdf,image/*,.ppt,.pptx,.key,.xlsx,.csv" label="Arquivo (PDF, imagem, planilha… até 25 MB)" />
          <div style={{ alignSelf: "end" }}><button className="btn btn-dark btn-sm">Adicionar ao perfil</button></div></form>
      </div>
    </>
  );
}
