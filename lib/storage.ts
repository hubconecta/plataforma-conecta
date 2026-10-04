import { createAdminClient } from "@/lib/supabase/admin";

export const publicUrl = (path?: string | null) => (path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/publico/${path}` : "");

// Link temporário para arquivos privados (aulas do Método). Só chame depois de conferir o acesso.
export async function signed(path?: string | null, seconds = 3600) {
  if (!path) return "";
  const { data } = await createAdminClient().storage.from("metodo").createSignedUrl(path, seconds);
  return data?.signedUrl || "";
}
