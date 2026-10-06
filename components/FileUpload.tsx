"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUploadUrl } from "@/app/(app)/upload-actions";

async function shrink(file: File): Promise<File | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const png = file.type.includes("png") || file.type.includes("webp");
    const type = png ? "image/webp" : "image/jpeg";
    const blob: Blob | null = await new Promise((res) => c.toBlob(res, type, 0.85));
    if (!blob || blob.size >= file.size) return null;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + (png ? ".webp" : ".jpg"), { type });
  } catch { return null; }
}

// Envia o arquivo direto para o armazenamento e guarda o caminho num campo escondido do formulário.
export default function FileUpload({ name, bucket, folder, accept, current, label }: { name: string; bucket: "metodo" | "publico" | "perfis" | "docs"; folder: string; accept?: string; current?: string | null; label: string }) {
  const [path, setPath] = useState(current || "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    let f = e.target.files?.[0];
    if (!f) return;
    // Fotos do celular costumam ser enormes: reduz para no máximo 1600px antes de enviar
    if (f.type.startsWith("image/") && !f.type.includes("gif") && !f.type.includes("svg") && f.size > 900 * 1024 && ["perfis", "publico"].includes(bucket)) {
      setMsg("Preparando a imagem…");
      const small = await shrink(f);
      if (small) f = small;
    }
    const max = bucket === "metodo" ? 50 : bucket === "docs" ? 25 : bucket === "perfis" ? 5 : 10;
    if (f.size > max * 1024 * 1024) { setMsg(`Arquivo grande demais (máximo ${max} MB).${/heic|heif/i.test(f.type + f.name) ? " Fotos HEIC do iPhone: tire um print da foto ou salve como JPG e envie de novo." : ""}${bucket === "metodo" ? " Para vídeos longos, use um link do Panda Video, YouTube (não listado) ou Vimeo." : ""}`); return; }
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
