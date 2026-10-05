"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const NICHES = ["Bem-estar", "Beleza", "Fitness", "Lifestyle", "Moda", "Maternidade", "Casa e decoração", "Gastronomia", "Finanças", "Outro"];
const YN = ["Sim", "Não"];

function F({ n, l, t = "text", req = false, ph = "", full = false }: any) {
  return <div className={`field ${full ? "full" : ""}`}><label htmlFor={"su_" + n}>{l}{req ? " *" : ""}</label><input className="input" id={"su_" + n} name={n} type={t} required={req} placeholder={ph} /></div>;
}
function S({ n, l, opts, full = false }: any) {
  return <div className={`field ${full ? "full" : ""}`}><label htmlFor={"su_" + n}>{l}</label><select className="input" id={"su_" + n} name={n}>{opts.map((o: string) => <option key={o}>{o}</option>)}</select></div>;
}

const GMV = ["Até R$ 1 mil", "R$ 1 mil a R$ 5 mil", "R$ 5 mil a R$ 20 mil", "R$ 20 mil a R$ 50 mil", "R$ 50 mil a R$ 100 mil", "Acima de R$ 100 mil"];
const TTS_LEVELS = ["Nível 0", "Nível 1", "Nível 2", "Nível 3", "Nível 4", "Nível 5", "Nível 6", "Nível 7", "Não sei"];

export default function Cadastro() {
  const [done, setDone] = useState(false);
  const [tts, setTts] = useState("");
  const [err, setErr] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) || "").trim();
    const answers: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === "string" && !["cpf"].includes(k)) answers[k] = v; });
    const cpf = g("cpf").replace(/\D/g, "");
    if (cpf) answers.cpf_final = cpf.slice(-2); // guardamos só o final do CPF nesta etapa
    const supabase = createClient();
    const { error } = await supabase.from("creator_applications").insert({ name: g("name"), email: g("email"), whatsapp: g("whatsapp"), city: g("city"), state: g("uf"), instagram: g("ig"), tiktok: g("tt"), niche: g("niche"), kind: g("kind"), answers });
    if (error) { setErr("Não foi possível enviar agora. Tente de novo em alguns minutos."); return; }
    setDone(true); window.scrollTo(0, 0);
  }
  const top = <div className="signup-top"><div><div className="logo-crop" style={{ ["--w" as any]: "150px" }}><img src="/logo-conecta.png" alt="Conecta" /></div><Link className="btn btn-ghost btn-sm" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="/login">Voltar</Link></div></div>;
  if (done) return <>{top}<div className="signup"><div className="empty"><h3>Seu cadastro foi enviado para análise da Conecta.</h3><p>Nossa equipe vai analisar seu perfil e entrar em contato pelo e-mail ou WhatsApp informado.</p></div></div></>;
  return (
    <>{top}
      <form className="signup" onSubmit={onSubmit}>
        <div><span className="eyebrow">Clube Conecta</span><h1 style={{ marginTop: 6 }}>Cadastro de creator</h1><p className="muted" style={{ marginTop: 6 }}>Conte sobre você para a Conecta te conhecer e indicar as campanhas certas. Campos com * são obrigatórios.</p></div>
        <fieldset className="fs"><legend>Dados pessoais</legend><div className="form-grid"><F n="name" l="Nome completo" req /><F n="artist" l="Nome artístico" /><F n="cpf" l="CPF" ph="000.000.000-00" /><F n="birth" l="Data de nascimento" t="date" /><F n="email" l="E-mail" t="email" req /><F n="whatsapp" l="WhatsApp" t="tel" req /></div></fieldset>
        <fieldset className="fs"><legend>Endereço (para receber produtos e press kits)</legend><div className="form-grid"><F n="cep" l="CEP" req ph="00000-000" /><F n="street" l="Rua" req /><F n="number" l="Número" req /><F n="comp" l="Complemento" /><F n="district" l="Bairro" req /><F n="city" l="Cidade" req /><S n="uf" l="Estado" opts={UFS} /></div></fieldset>
        <fieldset className="fs"><legend>Perfil profissional</legend><div className="form-grid"><div className="field full"><label htmlFor="su_what">O que você faz?</label><textarea className="input" id="su_what" name="what" /></div><S n="niche" l="Nicho principal" opts={NICHES} /><F n="niches2" l="Nichos secundários" /><S n="kind" l="Você é" opts={["Influenciadora", "UGC Creator", "Creator afiliada", "Influenciadora + afiliada", "UGC + afiliada", "Outro"]} /><S n="worksBrands" l="Já trabalha com marcas?" opts={YN} /><F n="brandTypes" l="Quais tipos de marcas?" /><S n="since" l="Há quanto tempo?" opts={["Ainda não trabalho", "Menos de 1 ano", "1 a 2 anos", "2 a 3 anos", "Mais de 3 anos"]} /><S n="campaigns" l="Já participou de campanhas?" opts={YN} /><S n="affiliates" l="Já trabalhou com afiliados?" opts={YN} /><S n="soldLinks" l="Já vendeu com links ou cupons?" opts={YN} /></div></fieldset>
        <fieldset className="fs"><legend>Redes sociais</legend><div className="form-grid"><F n="ig" l="Instagram" req ph="@seuperfil" /><F n="tt" l="TikTok" ph="@seuperfil" /><F n="yt" l="YouTube" /><F n="followers" l="Seguidores (se souber)" /></div></fieldset>
        <fieldset className="fs"><legend>TikTok Shop</legend><div className="form-grid">
          <div className="field"><label htmlFor="su_tts">Você tem TikTok Shop? *</label><select className="input" id="su_tts" name="ttShop" required value={tts} onChange={(e) => setTts(e.target.value)}><option value="" disabled>Escolha</option><option>Sim</option><option>Não</option></select></div>
          {tts === "Sim" ? <>
            <div className="field"><label htmlFor="su_gmv">Quanto você já faturou (GMV)? *</label><select className="input" id="su_gmv" name="ttGmv" required defaultValue=""><option value="" disabled>Escolha</option>{GMV.map((o) => <option key={o}>{o}</option>)}</select></div>
            <div className="field"><label htmlFor="su_lvl">Qual nível você está no TikTok Shop? *</label><select className="input" id="su_lvl" name="ttLevel" required defaultValue=""><option value="" disabled>Escolha</option>{TTS_LEVELS.map((o) => <option key={o}>{o}</option>)}</select></div>
          </> : null}
        </div></fieldset>
        <fieldset className="fs"><legend>Perfil de campanha</legend><div className="form-grid"><F n="want" l="Categorias que gostaria de trabalhar" full /><F n="avoid" l="Categorias que não gostaria" full /><S n="acceptProducts" l="Aceita receber produtos?" opts={YN} /><S n="acceptPaid" l="Aceita campanhas pagas?" opts={YN} /><S n="acceptComm" l="Aceita campanhas por comissão?" opts={YN} /><S n="acceptUgc" l="Aceita UGC?" opts={YN} /><S n="events" l="Disponível para eventos?" opts={YN} /><F n="eventCity" l="Cidade para eventos presenciais" /></div></fieldset>
        <label className="check"><input type="checkbox" required /> Autorizo a Conecta a usar estes dados para analisar meu perfil.</label>
        {err ? <p className="err">{err}</p> : null}
        <div><button className="btn btn-primary">Enviar cadastro para análise</button></div>
      </form>
    </>
  );
}
