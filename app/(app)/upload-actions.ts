"use server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/perms";
import { createAdminClient } from "@/lib/supabase/admin";

// Gera um link de envio de arquivo direto do navegador para o Supabase (sem passar pelo servidor da Vercel).
export async function getUploadUrl(bucket: string, folder: string, filename: string) {
  const { profile } = await getSession();
  if (!profile) return { error: "Faça login de novo." };
  const ok = bucket === "metodo" ? can(profile, "metodo_adm") : bucket === "publico" ? (can(profile, "presskits") || can(profile, "metodo_adm")) : false;
  if (!ok) return { error: "Sem permissão para enviar arquivos aqui." };
  const clean = filename.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  const path = `${folder.replace(/[^a-z0-9-]/g, "")}/${Date.now()}-${clean}`;
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error) return { error: error.message };
  return { path, token: data.token };
}
