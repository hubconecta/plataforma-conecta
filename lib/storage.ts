import { createAdminClient } from "@/lib/supabase/admin";

export const publicUrl = (path?: string | null, bucket = "publico") => (path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` : "");
export const photoUrl = (path?: string | null) => publicUrl(path, "perfis");

// Link temporário para documentos privados das creators (media kit, relatórios).
export async function signedDoc(path?: string | null, seconds = 3600) {
  if (!path) return "";
  const { data } = await createAdminClient().storage.from("docs").createSignedUrl(path, seconds);
  return data?.signedUrl || "";
}

// Link temporário para arquivos privados (aulas do Método). Só chame depois de conferir o acesso.
export async function signed(path?: string | null, seconds = 3600) {
  if (!path) return "";
  const { data } = await createAdminClient().storage.from("metodo").createSignedUrl(path, seconds);
  return data?.signedUrl || "";
}
