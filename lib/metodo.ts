// Ajudantes do Método Criadora Expert.
export function embedUrl(url?: string | null): { kind: "iframe" | "video" | "link" | "none"; src: string } {
  if (!url) return { kind: "none", src: "" };
  const u = url.trim();
  let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (m) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (m) return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}` };
  if (/pandavideo|bunny|mediadelivery|loom\.com\/embed|\/embed/i.test(u)) return { kind: "iframe", src: u.replace("loom.com/share/", "loom.com/embed/") };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { kind: "video", src: u };
  return { kind: "link", src: u };
}

export const COLORS = ["#E6007E", "#111111", "#FF5FA2", "#7A1F5C", "#C2185B", "#3D0A2A"];
