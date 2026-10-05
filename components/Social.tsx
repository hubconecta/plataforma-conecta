// Arroba clicável: abre o perfil da creator direto no Instagram ou no TikTok.
const clean = (h: string) => String(h || "").trim().replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
export const igUrl = (h?: string | null) => (h && clean(h) ? `https://www.instagram.com/${clean(h)}/` : "");
export const ttUrl = (h?: string | null) => (h && clean(h) ? `https://www.tiktok.com/@${clean(h)}` : "");
export const handle = (h?: string | null) => (h && clean(h) ? "@" + clean(h) : "");

export default function Social({ ig, tt, small = true }: { ig?: string | null; tt?: string | null; small?: boolean }) {
  if (!handle(ig) && !handle(tt)) return null;
  return (
    <span className={`social-links ${small ? "small" : ""}`}>
      {handle(ig) ? <a href={igUrl(ig)} target="_blank" rel="noopener noreferrer" title="Abrir no Instagram">📸 {handle(ig)}</a> : null}
      {handle(tt) ? <a href={ttUrl(tt)} target="_blank" rel="noopener noreferrer" title="Abrir no TikTok">🎵 {handle(tt)}</a> : null}
    </span>
  );
}
