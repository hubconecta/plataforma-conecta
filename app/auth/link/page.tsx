"use client";
import { useEffect, useState } from "react";
import AuthFrame from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/client";

// Termina o login quando o link do e-mail traz a sessão depois do "#".
export default function AuthLink() {
  const [erro, setErro] = useState("");
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const q = new URLSearchParams(window.location.search);
    const next = q.get("next") || "/nova-senha";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/nova-senha";
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    if (h.get("error") || !access_token || !refresh_token) {
      setErro("Este link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.");
      return;
    }
    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setErro("Não foi possível validar o link. Peça um novo em “Esqueci minha senha”.");
      else window.location.replace(safeNext);
    });
  }, []);
  return (
    <AuthFrame title={<>Bem-vinda à <em>Conecta.</em></>}>
      <div className="auth-card" style={{ gap: 14 }}>
        {erro ? (<><p className="err" role="alert">{erro}</p><a className="btn btn-primary btn-block" href="/esqueci-senha">Pedir novo link</a></>) : <p className="muted">Validando seu acesso…</p>}
      </div>
    </AuthFrame>
  );
}
