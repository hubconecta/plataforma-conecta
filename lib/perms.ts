// Fonte única de módulos e permissões (igual ao protótipo aprovado).
export type Role = "pendente" | "ceo" | "equipe" | "financeiro" | "marca" | "creator";

export type Mod = { key: string; label: string; icon: string; href: string; roles: Role[]; grant?: Role[]; soon?: boolean; sens?: boolean };

const ST: Role[] = ["ceo", "equipe"];
const FR: Role[] = ["ceo", "financeiro"];

export const MODS: Mod[] = [
  { key: "ceo", label: "Visão CEO", icon: "sparkle", href: "/ceo", roles: ["ceo"] },
  { key: "ops", label: "Dashboard operacional", icon: "grid", href: "/operacao", roles: ST },
  { key: "cad_creators", label: "Cadastros de creators", icon: "user", href: "/cadastros", roles: ST },
  { key: "creators", label: "Creators", icon: "users", href: "/creators", roles: ST },
  { key: "marcas", label: "Marcas", icon: "store", href: "/marcas", roles: ST },
  { key: "colaboradoras", label: "Colaboradoras", icon: "key", href: "/colaboradoras", roles: ["ceo"] },
  { key: "campanhas", label: "Campanhas", icon: "megaphone", href: "/campanhas", roles: [...ST, "marca"] },
  { key: "candidaturas", label: "Inscrições em campanhas", icon: "inbox", href: "/inscricoes", roles: ST },
  { key: "desafios", label: "Desafios", icon: "trophy", href: "/desafios", roles: [...ST, "marca"] },
  { key: "conteudos", label: "Conteúdos", icon: "film", href: "/conteudos", roles: [...ST, "marca"] },
  { key: "presskits", label: "Press kits", icon: "gift", href: "/presskits", roles: ST},
  { key: "amostras", label: "Amostras e envios", icon: "truck", href: "/envios", roles: ST },
  { key: "formularios", label: "Formulários", icon: "form", href: "/formularios", roles: ST},
  { key: "demandas", label: "Tarefas", icon: "tasks", href: "/tarefas", roles: ST },
  { key: "crm", label: "Leads de marcas", icon: "funnel", href: "/leads", roles: ST },
  { key: "relatorios", label: "Relatórios", icon: "chart", href: "/relatorios", roles: [...ST, "marca"] },
  { key: "metodo_adm", label: "Gerenciar Método", icon: "book", href: "/metodo/admin", roles: ST },
  { key: "fin", label: "Financeiro", icon: "wallet", href: "/financeiro", roles: FR, grant: ["equipe"], sens: true },
  { key: "notificacoes", label: "Notificações", icon: "bell", href: "/notificacoes", roles: ["ceo", "equipe", "financeiro", "marca", "creator"] },
  { key: "config", label: "Configurações", icon: "cog", href: "/configuracoes", roles: ["ceo"] },
  { key: "auditoria", label: "Histórico de ações", icon: "shield", href: "/historico", roles: ["ceo"] },
  { key: "marca_home", label: "Dashboard", icon: "grid", href: "/portal", roles: ["marca"] },
  { key: "clube", label: "Início", icon: "home", href: "/clube", roles: ["creator"] },
  { key: "oportunidades", label: "Oportunidades", icon: "compass", href: "/clube/oportunidades", roles: ["creator"] },
  { key: "minhas", label: "Minhas campanhas", icon: "megaphone", href: "/clube/minhas", roles: ["creator"] },
  { key: "cr_presskits", label: "Press kits", icon: "gift", href: "/clube/presskits", roles: ["creator"]},
  { key: "perfil", label: "Meu perfil e endereço", icon: "user", href: "/clube/perfil", roles: ["creator"]},
  { key: "marca_envios", label: "Press kits e envios", icon: "truck", href: "/portal/envios", roles: ["marca"]},
  { key: "metodo", label: "Método Criadora Expert", icon: "play", href: "/metodo", roles: ["creator"] },
  { key: "comissoes", label: "Comissões e recompensas", icon: "coins", href: "/clube/comissoes", roles: ["creator"] },
  { key: "fin_marca", label: "Financeiro", icon: "wallet", href: "/portal/financeiro", roles: ["marca"] },
  { key: "meus_desafios", label: "Desafios", icon: "trophy", href: "/clube/desafios", roles: ["creator"] },
];

export const MENU: Record<string, [string, string[]][]> = {
  ceo: [["Visão", ["ceo", "ops"]], ["Pessoas", ["cad_creators", "creators", "marcas", "colaboradoras"]], ["Operação", ["campanhas", "candidaturas", "desafios", "conteudos", "presskits", "amostras", "formularios"]], ["Gestão", ["demandas", "crm", "relatorios", "metodo_adm"]], ["Financeiro", ["fin"]], ["Sistema", ["notificacoes", "auditoria", "config"]]],
  equipe: [["Visão", ["ops"]], ["Pessoas", ["cad_creators", "creators", "marcas"]], ["Operação", ["campanhas", "candidaturas", "desafios", "conteudos", "presskits", "amostras", "formularios"]], ["Gestão", ["demandas", "crm", "relatorios", "metodo_adm"]], ["Financeiro", ["fin"]], ["Sistema", ["notificacoes"]]],
  financeiro: [["Financeiro", ["fin"]], ["Sistema", ["notificacoes"]]],
  marca: [["Sua marca", ["marca_home", "campanhas", "desafios", "conteudos", "marca_envios", "relatorios"]], ["Acompanhamento", ["fin_marca"]], ["Ajuda", ["notificacoes"]]],
  creator: [["Clube", ["clube", "oportunidades", "minhas", "meus_desafios", "cr_presskits"]], ["Ganhos", ["comissoes"]], ["Educação", ["metodo"]], ["Você", ["perfil", "notificacoes"]]],
  pendente: [],
};

export const HOME: Record<string, string> = { ceo: "/ceo", equipe: "/operacao", financeiro: "/financeiro", marca: "/portal", creator: "/clube", pendente: "/sem-acesso" };
export const ENV: Record<string, string> = { ceo: "Conecta ADM", equipe: "Conecta ADM", financeiro: "Conecta Financeiro", marca: "Portal da Marca", creator: "Clube Conecta", pendente: "Conecta" };
export const ROLE_LABEL: Record<string, string> = { ceo: "Super Admin · CEO", equipe: "Equipe Conecta", financeiro: "Financeiro", marca: "Marca", creator: "Creator", pendente: "Sem acesso" };
const ALWAYS = ["ops", "notificacoes"];

export function grantable(): Mod[] {
  return MODS.filter((m) => !ALWAYS.includes(m.key) && (m.roles.includes("equipe") || (m.grant || []).includes("equipe")));
}

export function can(profile: { role: string; perms?: string[] | null; status?: string } | null, key: string): boolean {
  if (!profile || profile.status === "inativo" || profile.status === "bloqueado") return false;
  const m = MODS.find((x) => x.key === key);
  if (!m) return false;
  if (profile.role === "equipe") {
    if (ALWAYS.includes(key)) return true;
    const ok = m.roles.includes("equipe") || (m.grant || []).includes("equipe");
    return ok && (profile.perms || []).includes(key);
  }
  return m.roles.includes(profile.role as Role);
}
