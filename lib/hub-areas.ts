// Áreas do CONECTA HUB (usadas na página de venda, nos cards bloqueados e no "Meu Hub").
export type HubArea = { key: string; slug: string; title: string; icon: string; emoji: string; desc: string };
export const HUB_AREAS: HubArea[] = [
  { key: "hub_campanhas", slug: "campanhas", title: "Campanhas exclusivas", icon: "megaphone", emoji: "📣", desc: "Campanhas com marcas abertas só para assinantes, com inscrição antes de todo mundo." },
  { key: "hub_comunidade", slug: "comunidade", title: "Comunidade exclusiva", icon: "users", emoji: "💬", desc: "Grupos, encontros e trocas com creators que estão no mesmo caminho que você." },
  { key: "hub_tiktok", slug: "tiktok", title: "TikTok Shop", icon: "bag", emoji: "🛍️", desc: "Oportunidades, produtos em alta e estratégias para vender mais no TikTok Shop." },
  { key: "hub_instagram", slug: "instagram", title: "Instagram", icon: "eye", emoji: "📸", desc: "Oportunidades de publi, ideias de conteúdo e caminhos para crescer no Instagram." },
  { key: "hub_academy", slug: "academy", title: "Conecta Academy", icon: "book", emoji: "🎓", desc: "Cursos, aulas e trilhas para você evoluir como creator, no seu ritmo." },
  { key: "hub_desafios", slug: "desafios", title: "Desafios exclusivos", icon: "trophy", emoji: "🏆", desc: "Desafios com prêmios só para quem faz parte do Hub." },
  { key: "hub_materiais", slug: "materiais", title: "Materiais e recursos", icon: "file", emoji: "🧰", desc: "Roteiros, modelos, mídia kit, checklists e arquivos prontos para usar." },
];
export const HUB_EXTRA = { emoji: "✨", title: "E o que vem por aí", desc: "Novas oportunidades e benefícios entram no Hub sem custo extra para quem já é assinante." };
export const hubArea = (slug: string) => HUB_AREAS.find((a) => a.slug === slug);
export const brl2 = (n: number) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
