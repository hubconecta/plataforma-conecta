"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UFS } from "@/lib/consts";
import { submitForm } from "./actions";

const TYPE: Record<string, string> = { nome: "text", texto: "text", numero: "number", email: "email", telefone: "tel", cpf: "text", data: "date", upload: "url", instagram: "text", tiktok: "text" };

export default function PublicForm({ form, brand, loggedIn }: { form: any; brand: { name: string; logo: string | null } | null; loggedIn: boolean }) {
  const [done, setDone] = useState(false);
  const [account, setAccount] = useState<string>("none");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(0);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    const fd = new FormData(e.currentTarget);
    const answers: Record<string, any> = {};
    for (const f of form.fields) {
      if (f.type === "multipla") { const v = fd.getAll(f.id).map(String); if (f.req && !v.length) { setErr(`Responda: ${f.label}`); return; } answers[f.id] = v; }
      else if (f.type === "endereco") { const o: any = {}; ["cep", "street", "number", "comp", "district", "city", "uf"].forEach((s) => (o[s] = String(fd.get(`${f.id}_${s}`) || "").trim())); answers[f.id] = o; }
      else answers[f.id] = String(fd.get(f.id) || "").trim();
    }
    const askPw = form.brand_id && form.create_access && !loggedIn;
    const password = String(fd.get("__pw") || ""), password2 = String(fd.get("__pw2") || "");
    if (askPw && password && password !== password2) { setErr("As senhas não são iguais."); return; }
    setBusy(true);
    let r;
    try { r = await submitForm(form.id, answers, { join: !!fd.get("__join"), password }); } catch { r = { ok: false, error: "Não foi possível enviar agora. Tente de novo em alguns minutos." } as any; }
    if (!r.ok) { setBusy(false); setErr(r.error || "Não foi possível enviar agora."); return; }
    if (r.account === "created" && r.email) {
      const { error } = await createClient().auth.signInWithPassword({ email: r.email, password });
      if (!error) { window.location.href = "/clube"; return; }
    }
    setBusy(false); setAccount(r.account || "none"); setEmail(r.email || "");
    setDone(true); window.scrollTo(0, 0);
  }
  if (done) return <div className="empty"><h3>Resposta enviada! 💖</h3><p>Obrigada! {brand ? `A ${brand.name} e a Conecta receberam` : "A equipe Conecta recebeu"} suas respostas.</p>
    {account === "exists" ? <p>Você já tem acesso à plataforma com o e-mail {email}. <a href="/login">Entrar</a></p> : null}
    {account === "created" ? <p>Seu acesso foi criado. <a href="/login">Entrar com seu e-mail e senha</a></p> : null}
    {account === "pending" ? <p>Seu acesso à plataforma será liberado pela equipe Conecta e você recebe o link pelo WhatsApp.</p> : null}
    {!brand ? <button className="btn btn-primary" onClick={() => { setDone(false); setK(k + 1); }}>Enviar outra resposta</button> : null}</div>;
  const askPw = form.brand_id && form.create_access && !loggedIn;
  return (
    <form key={k} className="signup" onSubmit={onSubmit}>
      {brand ? <div className="brand-form-head">{brand.logo ? <img src={brand.logo} alt={`Logo ${brand.name}`} /> : null}<span className="eyebrow">Formulário exclusivo · {brand.name}</span></div> : null}
      <div>{!brand ? <span className="eyebrow">Conecta</span> : null}<h1 style={{ marginTop: 6 }}>{form.title}</h1>{form.description ? <p className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{form.description}</p> : null}</div>
      <div className="fs">
        {form.fields.map((f: any) => {
          const L = <label htmlFor={`pf_${f.id}`}>{f.label}{f.req ? " *" : ""}</label>;
          if (f.type === "textarea") return <div className="field" key={f.id}>{L}<textarea className="input" id={`pf_${f.id}`} name={f.id} required={f.req} /></div>;
          if (f.type === "selecao") return <div className="field" key={f.id}>{L}<select className="input" id={`pf_${f.id}`} name={f.id} required={f.req} defaultValue=""><option value="" disabled>Escolha</option>{(f.options || []).map((o: string) => <option key={o}>{o}</option>)}</select></div>;
          if (f.type === "multipla") return <div className="field" key={f.id}><span className="lbl">{f.label}{f.req ? " *" : ""}</span><div className="perm-grid">{(f.options || []).map((o: string) => <label key={o} className="perm"><input type="checkbox" name={f.id} value={o} />{o}</label>)}</div></div>;
          if (f.type === "endereco") return <div className="field" key={f.id}><span className="lbl">{f.label}{f.req ? " *" : ""}</span><div className="form-grid">{[["cep", "CEP"], ["street", "Rua"], ["number", "Número"], ["comp", "Complemento"], ["district", "Bairro"], ["city", "Cidade"]].map(([s, l]) => <input key={s} className="input" name={`${f.id}_${s}`} placeholder={l} aria-label={l} required={f.req && s !== "comp"} />)}<select className="input" name={`${f.id}_uf`} aria-label="Estado" required={f.req} defaultValue=""><option value="" disabled>Estado</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div></div>;
          return <div className="field" key={f.id}>{L}<input className="input" id={`pf_${f.id}`} name={f.id} type={TYPE[f.type] || "text"} required={f.req} placeholder={f.type === "upload" ? "Cole o link do arquivo (Drive, Dropbox…)" : f.type === "instagram" || f.type === "tiktok" ? "@seuperfil" : f.type === "cpf" ? "000.000.000-00" : ""} /></div>;
        })}
      </div>
      {askPw ? <div className="fs"><div><b>Crie sua senha de acesso</b><p className="small muted">Com ela você entra na plataforma para ver os desafios{brand ? ` da ${brand.name}` : ""}. Use o mesmo e-mail que você colocou acima.</p></div>
        <div className="form-grid"><div className="field"><label htmlFor="pf_pw">Senha (mínimo 8 caracteres)</label><input className="input" id="pf_pw" name="__pw" type="password" minLength={8} autoComplete="new-password" /></div><div className="field"><label htmlFor="pf_pw2">Repita a senha</label><input className="input" id="pf_pw2" name="__pw2" type="password" minLength={8} autoComplete="new-password" /></div></div>
        <p className="small muted">Se você já tem acesso à plataforma, pode deixar em branco.</p></div> : null}
      {form.brand_id && form.ask_join ? <label className="perm join-box"><input type="checkbox" name="__join" value="1" /><span><b>Quero fazer parte também da base de creators da Conecta</b><br /><span className="small muted">Você entra no Clube Conecta e passa a receber oportunidades de outras marcas, desafios e conteúdos exclusivos.</span></span></label> : null}
      {err ? <p className="err" role="alert">{err}</p> : null}
      <div><button className="btn btn-primary" disabled={busy}>{busy ? "Enviando…" : "Enviar respostas"}</button></div>
    </form>
  );
}
