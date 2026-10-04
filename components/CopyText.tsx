"use client";
import { useState } from "react";

export default function CopyText({ text, label = "Copiar para Excel/Planilhas" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2500); }}>{ok ? "Copiado ✓" : label}</button>;
}
