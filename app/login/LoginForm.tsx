"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(fd.get("email")).trim(), password: String(fd.get("pass")) });
    if (error) { setMsg("E-mail ou senha incorretos. Confira os dados ou use “Esqueci minha senha”."); setBusy(false); return; }
    window.location.href = "/";
  }
  return (
    <form className="auth-card" style={{ gap: 14 }} onSubmit={onSubmit}>
      <div className="field"><label htmlFor="le">E-mail</label><input className="input" id="le" name="email" type="email" required autoComplete="username" placeholder="voce@email.com" /></div>
      <div className="field"><label htmlFor="lp">Senha</label><input className="input" id="lp" name="pass" type="password" required autoComplete="current-password" placeholder="Sua senha" /></div>
      {msg ? <p className="err" role="alert">{msg}</p> : null}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Entrando…" : "ENTRAR"}</button>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Link className="link-btn" href="/esqueci-senha">Esqueci minha senha</Link>
        <Link className="link-btn" href="/cadastro">Quero ser creator Conecta</Link>
      </div>
    </form>
  );
}
