"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UFS } from "@/lib/consts";

const TYPE: Record<string, string> = { texto: "text", numero: "number", email: "email", telefone: "tel", cpf: "text", data: "date", upload: "url", instagram: "text", tiktok: "text" };

export default function PublicForm({ form, creatorId }: { form: any; creatorId: string | null }) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(0);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr("");
    const fd = new FormData(e.currentTarget);
    const answers: Record<string, any> = {};
    for (const f of form.fields) {
      if (f.type === "multipla") { const v = fd.getAll(f.id).map(String); if (f.req && !v.length) { setErr(`Responda: ${f.label}`); return; } answers[f.id] = v; }
      else if (f.type === "endereco") { const o: any = {}; ["cep", "street", "number", "comp", "district", "city", "uf"].forEach((s) => (o[s] = String(fd.get(`${f.id}_${s}`) || "").trim())); answers[f.id] = o; }
      else answers[f.id] = String(fd.get(f.id) || "").trim();
    }
    setBusy(true);
    const { error } = await createClient().from("form_responses").insert({ form_id: form.id, creator_id: creatorId, answers });
    setBusy(false);
    if (error) { setErr("Não foi possível enviar agora. Tente de novo em alguns minutos."); return; }
    setDone(true); window.scrollTo(0, 0);
  }
  if (done) return <div className="empty"><h3>Resposta enviada!</h3><p>Obrigada. A equipe Conecta recebeu suas respostas.</p><button className="btn btn-primary" onClick={() => { setDone(false); setK(k + 1); }}>Enviar outra resposta</button></div>;
  return (
    <form key={k} className="signup" onSubmit={onSubmit}>
      <div><span className="eyebrow">Conecta</span><h1 style={{ marginTop: 6 }}>{form.title}</h1>{form.description ? <p className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{form.description}</p> : null}</div>
      <div className="fs">
        {form.fields.map((f: any) => {
          const L = <label htmlFor={`pf_${f.id}`}>{f.label}{f.req ? " *" : ""}</label>;
          if (f.type === "textarea") return <div className="field" key={f.id}>{L}<textarea className="input" id={`pf_${f.id}`} name={f.id} required={f.req} /></div>;
          if (f.type === "selecao") return <div className="field" key={f.id}>{L}<select className="input" id={`pf_${f.id}`} name={f.id} required={f.req} defaultValue=""><option value="" disabled>Escolha</option>{(f.options || []).map((o: string) => <option key={o}>{o}</option>)}</select></div>;
          if (f.type === "multipla") return <div className="field" key={f.id}><span className="lbl">{f.label}{f.req ? " *" : ""}</span><div className="perm-grid">{(f.options || []).map((o: string) => <label key={o} className="perm"><input type="checkbox" name={f.id} value={o} />{o}</label>)}</div></div>;
          if (f.type === "endereco") return <div className="field" key={f.id}><span className="lbl">{f.label}{f.req ? " *" : ""}</span><div className="form-grid">{[["cep", "CEP"], ["street", "Rua"], ["number", "Número"], ["comp", "Complemento"], ["district", "Bairro"], ["city", "Cidade"]].map(([s, l]) => <input key={s} className="input" name={`${f.id}_${s}`} placeholder={l} aria-label={l} required={f.req && s !== "comp"} />)}<select className="input" name={`${f.id}_uf`} aria-label="Estado" required={f.req} defaultValue=""><option value="" disabled>Estado</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></div></div>;
          return <div className="field" key={f.id}>{L}<input className="input" id={`pf_${f.id}`} name={f.id} type={TYPE[f.type] || "text"} required={f.req} placeholder={f.type === "upload" ? "Cole o link do arquivo (Drive, Dropbox…)" : f.type === "instagram" || f.type === "tiktok" ? "@seuperfil" : f.type === "cpf" ? "000.000.000-00" : ""} /></div>;
        })}
      </div>
      {err ? <p className="err" role="alert">{err}</p> : null}
      <div><button className="btn btn-primary" disabled={busy}>{busy ? "Enviando…" : "Enviar respostas"}</button></div>
    </form>
  );
}
