// Ranking do desafio: quem está na frente em conteúdos e vendas.
import { Avatar } from "@/components/ui";

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const medal = (p: number) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : `${p}º`);

export default async function ChallengeRanking({ supabase, challengeId, limit = 10, target, title = "Ranking do desafio" }: { supabase: any; challengeId: string; limit?: number; target?: number; title?: string }) {
  const { data, error } = await supabase.rpc("challenge_ranking", { ch: challengeId });
  if (error || !data?.length) return null;
  const rows: any[] = data;
  const top = rows.slice(0, limit);
  const me = rows.find((r) => r.is_me);
  const show = me && !top.some((r) => r.is_me) ? [...top, me] : top;
  const hasSales = rows.some((r) => Number(r.sales) > 0);
  const lead = rows[0];
  return (
    <div className="ranking">
      <div className="ranking-h"><b>🏆 {title}</b><span className="small muted">{rows.length} participando</span></div>
      {show.map((r, i) => {
        const gap = me && lead && r.is_me && r.pos > 1 ? Math.max(0, lead.contents - r.contents) : 0;
        return (
          <div key={i} className={`rk-row ${r.is_me ? "me" : ""}`}>
            <span className="rk-pos">{medal(r.pos)}</span>
            <Avatar name={r.display_name} src={r.avatar_path} size={28} />
            <span className="rk-name">{r.display_name}{r.is_me ? " (você)" : ""}{gap ? <span className="small muted"> · faltam {gap} para o 1º lugar</span> : null}</span>
            <span className="rk-num" title="Conteúdos">🎬 {r.contents}{target ? `/${target}` : ""}</span>
            {hasSales ? <span className="rk-num" title="Vendas">💰 {brl(r.sales)}</span> : null}
          </div>);
      })}
    </div>
  );
}
