import Icon from "./Icon";

const PILL: Record<string, string> = {
  Ativa: "ok", Ativo: "ok", ativo: "ok", Aprovada: "ok", Aprovado: "ok", Publicado: "ok", Publicada: "ok", Entregue: "ok", Concluído: "ok", Pago: "ok", Paga: "ok", "Em dia": "ok", "Cliente convertido": "ok", Gratuito: "ok", Liberada: "ok",
  "Inscrições abertas": "pink", Nova: "pink", "Novo Lead": "pink", "Em aprovação": "pink", Disponível: "pink",
  Enviada: "info", Enviado: "info", Proposta: "info", "Convite enviado": "info", convite_enviado: "info", "Link enviado": "info", Agendado: "info", "Contato realizado": "info", "Reunião agendada": "info", "Proposta enviada": "info", "Em andamento": "info", "Em trânsito": "info", Preparando: "info", Comprado: "info",
  "Em análise": "warn", Negociação: "warn", "Em negociação": "warn", Pendente: "warn", "Ajuste solicitado": "warn", "Ajuste necessário": "warn", "Aguardando envio": "warn", "Aguardando pagamento": "warn", Aguardando: "warn", "Em aberto": "warn", "Follow-up futuro": "warn", "A fazer": "warn", Média: "warn",
  Reprovada: "bad", Reprovado: "bad", Rejeitada: "bad", Recusada: "bad", Recusado: "bad", bloqueado: "bad", Bloqueado: "bad", Atrasado: "bad", Vencido: "bad", Problema: "bad", Cancelado: "bad", Alta: "bad", "Não convertido": "bad",
  inativo: "neutral", Pausada: "neutral", Pausado: "neutral", Encerrada: "neutral", Encerrado: "neutral", Futura: "neutral", Lead: "neutral", "Lista de espera": "neutral", Rascunho: "neutral", Oculto: "neutral", Oculta: "neutral", Baixa: "neutral", "Sem acesso": "neutral", "Club Criadora": "pink", "Comissão de marca": "info", "Press kit": "warn", Outro: "neutral", Cancelada: "bad",
};
export function Pill({ s }: { s: string }) {
  return <span className={`pill ${PILL[s] || "neutral"}`}>{s}</span>;
}
export function PageH({ eyebrow, title, sub, right }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="page-h">
      <div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1>{sub ? <p className="muted">{sub}</p> : null}</div>
      {right ? <div style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{right}</div> : null}
    </div>
  );
}
export function Kpi({ k, v, hero }: { k: string; v: React.ReactNode; hero?: boolean }) {
  return <div className={`kpi ${hero ? "hero" : ""}`}><span className="k">{k}</span><span className="v">{v}</span></div>;
}
export function Empty({ icon = "inbox", title, text, children }: { icon?: string; title: string; text?: string; children?: React.ReactNode }) {
  return <div className="empty"><span className="big"><Icon name={icon} /></span><h3>{title}</h3>{text ? <p>{text}</p> : null}{children}</div>;
}
export function Person({ name, sub }: { name: string; sub?: string }) {
  const ini = (name || "?").replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <div className="person"><span className="av" aria-hidden="true">{ini}</span><div><b>{name}</b>{sub ? <span>{sub}</span> : null}</div></div>;
}
export const fd = (s?: string | null) => (s ? new Date(s + (s.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR") : "—");
export const brl = (n?: number | null) => (n == null ? "—" : "R$ " + Math.round(Number(n)).toLocaleString("pt-BR"));
export function Notice({ q }: { q?: { ok?: string; erro?: string } }) {
  if (q?.ok) return <div className="notice ok">{q.ok}</div>;
  if (q?.erro) return <div className="notice bad">{q.erro}</div>;
  return null;
}
