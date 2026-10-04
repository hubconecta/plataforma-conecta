import { requireModule } from "@/lib/session";
import { PageH, Notice, Avatar } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import { photoUrl } from "@/lib/storage";
import { saveBrandProfile, saveMyProfile } from "../../perfil/actions";

export default async function PerfilMarca({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("perfil_marca");
  const p: any = profile;
  const { data: b } = await supabase.from("brands").select("*").eq("id", profile.brand_id).single();
  const F = ({ n, l, v }: { n: string; l: string; v?: any }) => <div className="field"><label htmlFor={`bp_${n}`}>{l}</label><input className="input" id={`bp_${n}`} name={n} defaultValue={v || ""} /></div>;
  return (
    <>
      <PageH eyebrow="Sua marca" title="Perfil da marca" sub="Esse é o perfil que a Conecta e as creators das suas campanhas veem." />
      <Notice q={q} />
      <div className="card profile-head">{b?.logo_path ? <img className="brand-logo" src={photoUrl(b.logo_path)} alt={`Logo ${b?.name}`} /> : <Avatar name={b?.name || "Marca"} size={72} />}<div><h2>{b?.name}</h2><span className="muted">{[b?.category, b?.instagram].filter(Boolean).join(" · ")}</span></div></div>
      <form action={saveBrandProfile} className="card form-grid">
        <FileUpload name="logo_path" bucket="perfis" folder="marcas" accept="image/*" current={b?.logo_path} label="Logo da marca (PNG com fundo transparente fica melhor)" />
        <div className="field full"><label>Sobre a marca</label><textarea className="input" name="description" defaultValue={b?.description || ""} /></div>
        <F n="site" l="Site" v={b?.site} /><F n="instagram" l="Instagram" v={b?.instagram} /><F n="tiktok" l="TikTok" v={b?.tiktok} />
        <F n="contact_name" l="Responsável" v={b?.contact_name} /><F n="email" l="E-mail de contato" v={b?.email} /><F n="whatsapp" l="WhatsApp" v={b?.whatsapp} />
        <div><button className="btn btn-primary btn-sm">Salvar perfil da marca</button></div>
      </form>
      <form action={saveMyProfile} className="card form-grid"><input type="hidden" name="back" value="/portal/perfil" />
        <div className="card-h full"><h2>Seu acesso</h2><span className="small muted">{p.email}</span></div>
        <FileUpload name="avatar_path" bucket="perfis" folder="marcas" accept="image/*" current={p.avatar_path} label="Sua foto" />
        <div className="field"><label>Seu nome</label><input className="input" name="name" defaultValue={p.name || ""} required /></div>
        <div className="field"><label>WhatsApp</label><input className="input" name="whatsapp" defaultValue={p.whatsapp || ""} /></div>
        <div><button className="btn btn-ghost btn-sm">Salvar</button></div>
      </form>
    </>
  );
}
