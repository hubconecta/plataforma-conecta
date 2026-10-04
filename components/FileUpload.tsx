"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUploadUrl } from "@/app/(app)/upload-actions";

// Envia o arquivo direto para o armazenamento e guarda o caminho num campo escondido do formulário.
export default function FileUpload({ name, bucket, folder, accept, current, label }: { name: string; bucket: "metodo" | "publico" | "perfis" | "docs"; folder: string; accept?: string; current?: string | null; label: string }) {
  const [path, setPath] = useState(current || "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const max = bucket === "metodo" ? 50 : bucket === "docs" ? 25 : bucket === "perfis" ? 5 : 10;
    if (f.size > max * 1024 * 1024) { setMsg(`Arquivo grande demais (máximo ${max} MB).${bucket === "metodo" ? " Para vídeos longos, use um link do Panda Video, YouTube (não listado) ou Vimeo." : ""}`); return; }
    setBusy(true); setMsg("Enviando…");
    const r: any = await getUploadUrl(bucket, folder, f.name);
    if (r.error) { setBusy(false); setMsg(r.error); return; }
    const { error } = await createClient().storage.from(bucket).uploadToSignedUrl(r.path, r.token, f);
    setBusy(false);
    if (error) { setMsg("Não foi possível enviar: " + error.message); return; }
    setPath(r.path); setMsg("Arquivo enviado ✓ (lembre de salvar)");
  }
  return (
    <div className="field">
      <label>{label}</label>
      <input type="hidden" name={name} value={path} />
      <input className="input" type="file" accept={accept} onChange={onFile} disabled={busy} />
      {path ? <span className="small muted">Atual: {path.split("/").pop()} <button type="button" className="link-btn" onClick={() => { setPath(""); setMsg("Arquivo removido (lembre de salvar)"); }}>remover</button></span> : null}
      {msg ? <span className="small" role="status">{msg}</span> : null}
    </div>
  );
}
