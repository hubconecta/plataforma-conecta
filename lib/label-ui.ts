// Etiquetas (estilo Trello): tipos, cores e onde cada etiqueta aparece.
// Pode ser usado no servidor e no navegador.

export type Label = { id: string; name: string; color: string; scope: string; position?: number };
export type Entity = "marca" | "creator" | "form" | "task" | "event";

export const ENT: Record<Entity, { scope: string; mod: string; paths: string[]; nome: string }> = {
  marca: { scope: "Marcas", mod: "marcas", paths: ["/marcas"], nome: "marca" },
  creator: { scope: "Creators", mod: "creators", paths: ["/creators"], nome: "creator" },
  form: { scope: "Formulários", mod: "formularios", paths: ["/formularios"], nome: "formulário" },
  task: { scope: "Tarefas", mod: "demandas", paths: ["/tarefas", "/calendario"], nome: "tarefa" },
  event: { scope: "Calendário", mod: "calendario", paths: ["/calendario"], nome: "compromisso" },
};

export const SCOPES = ["Todas", "Marcas", "Creators", "Formulários", "Tarefas", "Calendário"];

export const LABEL_COLORS: [string, string][] = [
  ["#61BD4F", "Verde"], ["#F2D600", "Amarelo"], ["#FF9F1A", "Laranja"], ["#EB5A46", "Vermelho"],
  ["#C377E0", "Roxo"], ["#0079BF", "Azul"], ["#00C2E0", "Azul-claro"], ["#51E898", "Menta"],
  ["#FF78CB", "Rosa"], ["#E6007E", "Pink Conecta"], ["#8B5E3C", "Marrom"], ["#344563", "Grafite"],
];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const safeColor = (c: string) => (HEX.test(c || "") ? c : "#E6007E");

// Texto preto em cores claras (amarelo, menta) e branco nas escuras.
export function textOn(hex: string) {
  const c = safeColor(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#111" : "#fff";
}

export const fitsScope = (l: Label, e: Entity) => l.scope === "Todas" || l.scope === ENT[e].scope;
