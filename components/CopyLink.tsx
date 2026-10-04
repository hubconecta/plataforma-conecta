"use client";
import { useState } from "react";

export default function CopyLink({ link, text }: { link: string; text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={async () => { await navigator.clipboard.writeText(link); setOk(true); }}>{ok ? "Link copiado ✓" : "Copiar link"}</button>
      <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text + "\n\n" + link)}`}>Enviar pelo WhatsApp</a>
    </div>
  );
}
