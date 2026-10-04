import { requireModule } from "@/lib/session";
import { PageH, Notice, Avatar } from "@/components/ui";
import FileUpload from "@/components/FileUpload";
import PushToggle from "@/components/PushToggle";
import { ROLE_LABEL } from "@/lib/perms";
import { saveMyProfile } from "./actions";

export default async function Perfil({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { profile } = await requireModule("conta");
  const p: any = profile;
  return (
    <>
      <PageH eyebrow={ROLE_LABEL[profile.role]} title="Meu perfil" />
      <Notice q={q} />
      <div className="card profile-head"><Avatar name={p.name} src={p.avatar_path} size={72} /><div><h2>{p.name}</h2><span className="muted">{p.cargo || ROLE_LABEL[profile.role]} · {p.email}</span></div></div>
      <form action={saveMyProfile} className="card form-grid">
        <FileUpload name="avatar_path" bucket="perfis" folder="equipe" accept="image/*" current={p.avatar_path} label="Foto de perfil" />
        <div className="field"><label>Nome</label><input className="input" name="name" defaultValue={p.name || ""} required /></div>
        <div className="field"><label>Cargo</label><input className="input" name="cargo" defaultValue={p.cargo || ""} /></div>
        <div className="field"><label>WhatsApp</label><input className="input" name="whatsapp" defaultValue={p.whatsapp || ""} /></div>
        <div className="field"><label>Instagram</label><input className="input" name="instagram" defaultValue={p.instagram || ""} placeholder="@seuperfil" /></div>
        <div className="field full"><label>Sobre você</label><textarea className="input" name="bio" defaultValue={p.bio || ""} /></div>
        <div><button className="btn btn-primary btn-sm">Salvar perfil</button></div>
      </form>
      <PushToggle />
    </>
  );
}
