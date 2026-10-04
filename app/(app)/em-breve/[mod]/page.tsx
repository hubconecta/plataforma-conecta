import { getSession } from "@/lib/session";
import { PageH, Empty } from "@/components/ui";

const NAMES: Record<string, string> = { desafios: "Desafios", conteudos: "Conteúdos", presskits: "Press kits", amostras: "Amostras e envios", formularios: "Formulários", tarefas: "Tarefas", leads: "Leads de marcas", relatorios: "Relatórios", metodo: "Método Criador Expert", financeiro: "Financeiro", cr_presskits: "Press kits", perfil: "Meu perfil e endereço", marca_envios: "Press kits e envios" };

export default async function EmBreve({ params }: { params: Promise<{ mod: string }> }) {
  const { mod } = await params;
  await getSession();
  return (
    <>
      <PageH eyebrow="Próxima entrega" title={NAMES[mod] || "Em breve"} />
      <Empty icon="sparkle" title="Este módulo chega na próxima versão" text="Ele já está desenhado e aprovado no protótipo. Assim que for publicado, aparece aqui com os seus dados reais." />
    </>
  );
}
