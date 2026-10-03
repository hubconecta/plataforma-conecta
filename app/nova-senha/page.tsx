"use client";
import { useState } from "react";
import AuthFrame from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

export default function NovaSenha() {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p1 = String(fd.get("p1")), p2 = String(fd.get("p2"));
    if (p1 !== p2) return setMsg("As senhas não são iguais.");
    if (p1.length < 8) return setMsg("Use pelo menos 8 caracteres.");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) return setMsg("O link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.");
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
    window.location.href = "/";
  }
  return (
    <AuthFrame title={<>Bem-vinda à <em>Conecta.</em></>}>
      <div><span className="eyebrow">Acesso</span><h1 style={{ marginTop: 6 }}>CRIE SUA NOVA SENHA</h1><p className="muted" style={{ marginTop: 6 }}>Escolha uma senha só sua para entrar na plataforma.</p></div>
      <form className="auth-card" style={{ gap: 14 }} onSubmit={onSubmit}>
        <div className="field"><label htmlFor="np1">Nova senha</label><input className="input" id="np1" name="p1" type="password" minLength={8} required autoComplete="new-password" /></div>
        <div className="field"><label htmlFor="np2">Confirme a nova senha</label><input className="input" id="np2" name="p2" type="password" minLength={8} required autoComplete="new-password" /></div>
        {msg ? <p className="err" role="alert">{msg}</p> : null}
        <button className="btn btn-primary btn-block">Salvar e entrar</button>
      </form>
    </AuthFrame>
  );
}
