"use server";
import { revalidatePath } from "next/cache";
import { requireModule, logAction } from "@/lib/session";
import { g, back, notifyProfiles } from "@/lib/act";

export async function addHighlight(fd: FormData) {
  const { supabase, profile } = await requireModule("relatorios");
  if (profile.role === "marca") back("/relatorios", "Sem permissão.", false);
  const brand = g(fd, "brand_id"), title = g(fd, "title"), path = g(fd, "back") || `/relatorios?marca=${brand}`;
  if (!brand || !title) back(path, "Informe o título do destaque.", false);
  const { error } = await supabase.from("report_entries").insert({ brand_id: brand, kind: "Destaque", title, summary: g(fd, "summary"), by_name: profile.name });
  if (error) back(path, error.message, false);
  if (fd.get("notify")) await notifyProfiles(supabase, { brand_id: brand }, `Novo destaque no relatório: ${title}`, "/relatorios");
  await logAction(supabase, profile, `adicionou um destaque ao relatório da marca: ${title}`, "Relatórios", brand);
  revalidatePath("/relatorios");
  back(path, "Destaque adicionado ao relatório da marca.");
}

export async function publishReport(fd: FormData) {
  const { supabase, profile } = await requireModule("relatorios");
  if (profile.role === "marca") back("/relatorios", "Sem permissão.", false);
  const brand = g(fd, "brand_id"), path = g(fd, "back") || "/relatorios";
  const data = JSON.parse(g(fd, "data") || "{}"), campaigns = JSON.parse(g(fd, "campaigns") || "[]");
  const title = `${g(fd, "kind") || "Relatório da marca"} · ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
  const { error } = await supabase.from("reports").insert({ brand_id: brand, title, period: g(fd, "period"), data, campaigns, by_name: profile.name });
  if (error) back(path, error.message, false);
  await notifyProfiles(supabase, { brand_id: brand }, `Relatório atualizado: ${title}`, "/relatorios?tab=publicados");
  await logAction(supabase, profile, `publicou o relatório "${title}" no portal da marca`, "Relatórios", brand);
  back(path, "Relatório publicado no portal da marca. Ela foi avisada.");
}
