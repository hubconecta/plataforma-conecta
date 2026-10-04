"use client";
import { useState } from "react";

// Vários links de uma vez (um conteúdo, comprovante ou arquivo por linha).
export default function MultiLinks({ name = "links", label = "Links dos conteúdos", initial = [], required }: { name?: string; label?: string; initial?: string[]; required?: boolean }) {
  const [list, setList] = useState<string[]>(initial.length ? initial : [""]);
  return (
    <div className="field full">
      <label>{label}</label>
      {list.map((v, i) => (
        <div key={i} className="inline-form">
          <input className="input" type="url" name={name} placeholder={`https://  (link ${i + 1})`} value={v} required={required && i === 0} onChange={(e) => setList(list.map((x, j) => (j === i ? e.target.value : x)))} style={{ flex: 1 }} />
          {list.length > 1 ? <button type="button" className="btn btn-ghost btn-sm" aria-label="Remover link" onClick={() => setList(list.filter((_, j) => j !== i))}>×</button> : null}
        </div>
      ))}
      <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setList([...list, ""])}>+ Adicionar outro link</button></div>
      <span className="small muted">Coloque um link por campo: Reels, Stories, TikTok, Drive com os vídeos…</span>
    </div>
  );
}
