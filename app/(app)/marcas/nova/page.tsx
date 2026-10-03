import { requireModule } from "@/lib/session";
import { can } from "@/lib/perms";
import { PageH, Notice } from "@/components/ui";
import BrandForm from "../BrandForm";

export default async function NovaMarca({ searchParams }: { searchParams: Promise<any> }) {
  const q = await searchParams;
  const { supabase, profile } = await requireModule("marcas");
  const { data: owners } = await supabase.from("profiles").select("id,name").in("role", ["ceo", "equipe"]).order("name");
  return (<><PageH eyebrow="Marcas" title="Nova marca" sub="O cadastro oficial é sempre feito pela Conecta. O acesso da marca ao portal é criado depois." /><Notice q={q} /><BrandForm owners={owners || []} showFin={can(profile, "fin")} /></>);
}
