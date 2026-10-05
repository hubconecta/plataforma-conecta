// Mostra a premiação do desafio (colocações, requisitos e prêmios).
const brl = (v: any) => { const n = Number(v); return n ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""; };

export function prizesOf(c: any): any[] {
  const p = Array.isArray(c?.prizes) ? c.prizes.filter((x: any) => x && (x.reward_label || x.requirement || Number(x.reward_value))) : [];
  if (p.length) return p;
  return c?.reward_label || c?.reward_value ? [{ place: c.winners > 1 ? `Até ${c.winners} ganhadoras` : "Prêmio", reward_type: c.reward_type, reward_label: c.reward_label, reward_value: c.reward_value, requirement: "" }] : [];
}

export const prizeSummary = (c: any) => { const p = prizesOf(c); if (!p.length) return c?.reward_type || "—"; return p.length === 1 ? p[0].reward_label || brl(p[0].reward_value) || p[0].reward_type : `${p.length} prêmios · 1º ${p[0].reward_label || brl(p[0].reward_value) || p[0].reward_type}`; };

export default function PrizeList({ c, compact }: { c: any; compact?: boolean }) {
  const p = prizesOf(c);
  if (!p.length) return null;
  return (
    <div className={`prize-list ${compact ? "compact" : ""}`}>
      {p.map((x: any, i: number) => (
        <div className="prize-item" key={i}>
          <span className="prize-medal">{/^1º/.test(x.place) ? "🥇" : /^2º/.test(x.place) ? "🥈" : /^3º/.test(x.place) ? "🥉" : "🏆"}</span>
          <div><b>{x.place}</b>{x.reward_label || x.reward_value ? <span> · {x.reward_label}{x.reward_value && Number(x.reward_value) ? `${x.reward_label ? " · " : ""}${brl(x.reward_value)}` : ""}</span> : null}
            {x.requirement ? <div className="small muted">Requisito: {x.requirement}</div> : null}</div>
        </div>))}
    </div>
  );
}
