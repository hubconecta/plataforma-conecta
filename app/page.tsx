import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HOME } from "@/lib/perms";

export default async function Root() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  redirect(HOME[profile?.role || "pendente"] || "/sem-acesso");
}
