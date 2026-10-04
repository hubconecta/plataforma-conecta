"use client";
import { useState } from "react";
import AuthFrame from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

// O link só é usado quando a pessoa clica no botão (prévias do WhatsApp não gastam o link).
export default function Entrar() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg("");
    const q = new URLSearchParams(window.location.search);
    const token_hash = q.get("token_hash") || "";
    const type = (q.get("type") === "recovery" ? "recovery" : "invite") as any;
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) { setBusy(false); setMsg("Este link expirou ou já foi usado. Peça um novo link para a Conecta."); return; }
    window.location.replace("/nova-senha");
  }
  return (
    <AuthFrame title={<>Bem-vinda à <em>Conecta.</em></>}>
      <div><span className="eyebrow">Primeiro acesso</span><h1 style={{ marginTop: 6 }}>SEU ACESSO ESTÁ PRONTO</h1><p className="muted" style={{ marginTop: 6 }}>Clique no botão para criar sua senha e entrar na plataforma.</p></div>
      <div className="auth-card" style={{ gap: 14 }}>
        {msg ? <p className="err" role="alert">{msg}</p> : null}
        <button className="btn btn-primary btn-block" onClick={go} disabled={busy}>{busy ? "Validando…" : "Criar minha senha"}</button>
      </div>
    </AuthFrame>
  );
}
