// Selo de nível da creator (ex.: Creator Iniciante).
export function levelOf(levels: any[], pts: number) {
  const L = [...(levels || [])].sort((a, b) => a.min_points - b.min_points);
  let cur = L[0], next: any = null;
  for (const l of L) { if (pts >= l.min_points) cur = l; else { next = l; break; } }
  const pct = next ? Math.min(100, Math.round(((pts - (cur?.min_points || 0)) / Math.max(1, next.min_points - (cur?.min_points || 0))) * 100)) : 100;
  return { cur, next, pct, idx: L.indexOf(cur) + 1, total: L.length };
}

export default function LevelBadge({ level, small }: { level?: any; small?: boolean }) {
  if (!level) return null;
  return <span className="lvl" style={{ ["--lv" as any]: level.color || "#E6007E", fontSize: small ? 11 : 12.5 }}>★ {level.name}</span>;
}
