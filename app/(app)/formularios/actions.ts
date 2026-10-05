"use server";
import { revalidatePath } from "next/cache";
import { requireModule, getSession, logAction } from "@/lib/session";
import { g, orNull, back } from "@/lib/act";
import { FIELD_TYPES } from "@/lib/consts";

export async function saveForm(fd: FormData) {
  const { supabase, profile } = await requireModule("formularios");
  const id = g(fd, "id");
  const path = id ? `/formularios/${id}` : "/formularios/novo";
  let fields: any[] = [];
  try { fields = JSON.parse(g(fd, "fields") || "[]"); } catch { back(path, "Não foi possível ler as perguntas.", false); }
  const types = FIELD_TYPES.map((t) => t[0]);
  fields = fields.filter((f) => f && String(f.label || "").trim() && types.includes(f.type)).map((f) => ({ id: String(f.id).slice(0, 40), label: String(f.label).trim().slice(0, 300), type: f.type, req: !!f.req, ...(["selecao", "multipla"].includes(f.type) ? { options: (f.options || []).map((o: string) => String(o).trim()).filter(Boolean).slice(0, 50) } : {}) }));
  if (!fields.length) back(path, "Adicione pelo menos uma pergunta.", false);
  const slug = g(fd, "slug").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const brand_id = orNull(g(fd, "brand_id"));
  const row: any = { title: g(fd, "title"), slug, use: g(fd, "use") || "Pesquisa", campaign_id: orNull(g(fd, "campaign_id")), status: g(fd, "status") || "Rascunho", description: orNull(g(fd, "description")), fields, brand_id, create_access: !!brand_id && !!fd.get("create_access"), ask_join: !!brand_id && !!fd.get("ask_join") };
  if (brand_id && row.status === "Publicado" && (!fields.some((x) => x.type === "email") || !fields.some((x) => x.type === "nome" || (x.type === "texto" && /nome/i.test(x.label))))) back(path, "Formulário de marca precisa das perguntas “Nome completo” e “E-mail”.", false);
  if (!row.title || !slug) back(path, "Informe o título e o endereço do link.", false);
  const { data, error } = id ? await supabase.from("forms").update(row).eq("id", id).select("id").single() : await supabase.from("forms").insert(row).select("id").single();
  if (error) back(path, error.message.includes("duplicate") ? "Este endereço de link já está em uso. Escolha outro." : "Não foi possível salvar: " + error.message, false);
  await logAction(supabase, profile, `salvou o formulário ${row.title} (${row.status})`, "Formulários", data.id);
  revalidatePath("/formularios");
  back(`/formularios/${data.id}`, row.status === "Publicado" ? brand_id ? "Formulário da marca publicado. Copie o link e mande no grupo das creators da marca." : "Formulário publicado. Copie o link e envie para as creators." : "Formulário salvo.");
}

export async function deleteForm(fd: FormData) {
  const s = await getSession();
  if (s.profile?.role !== "ceo") back("/formularios", "Só a CEO pode excluir.", false);
  const id = g(fd, "id");
  const { data: f } = await s.supabase.from("forms").select("title").eq("id", id).single();
  await s.supabase.from("forms").delete().eq("id", id);
  await logAction(s.supabase, s.profile!, `excluiu o formulário ${f?.title || ""} e as respostas`, "Formulários", null);
  back("/formularios", "Formulário excluído.");
}
