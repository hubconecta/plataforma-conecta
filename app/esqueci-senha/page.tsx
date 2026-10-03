"use client";
import Link from "next/link";
import { useState } from "react";
import AuthFrame from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

export default function Esqueci() {
  const [sent, setSent] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/nova-senha` });
    setSent(true);
  }
  return (
    <AuthFrame>
      {sent ? (
        <div className="empty" style={{ borderStyle: "solid" }}><h3>Confira seu e-mail</h3><p>Se existir uma conta com esse endereço, você vai receber um link para criar uma nova senha.</p><Link className="btn btn-ghost" href="/login">Voltar para o login</Link></div>
      ) : (
        <>
          <div><span className="eyebrow">Recuperar acesso</span><h1 style={{ marginTop: 6 }}>Esqueci minha senha</h1><p className="muted" style={{ marginTop: 6 }}>Informe o e-mail da sua conta. Enviaremos um link seguro para criar uma nova senha.</p></div>
          <form className="auth-card" style={{ gap: 14 }} onSubmit={onSubmit}>
            <div className="field"><label htmlFor="fe">E-mail</label><input className="input" id="fe" name="email" type="email" required /></div>
            <button className="btn btn-primary btn-block">Enviar link</button>
            <Link className="link-btn" href="/login">Voltar para o login</Link>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
