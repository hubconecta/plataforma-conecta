import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Links de convite e de recuperação de senha enviados pelo Supabase chegam aqui.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as any;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/nova-senha";
  const supabase = await createClient();
  let ok = false;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!token_hash && !code) {
    // Modelo de e-mail padrão do Supabase: a sessão vem no "#" do link, que só o navegador lê.
    // O navegador mantém o "#" no redirecionamento, então a página /auth/link termina o login.
    return NextResponse.redirect(new URL(`/auth/link?next=${encodeURIComponent(next)}`, origin));
  }
  return NextResponse.redirect(new URL(ok ? next : "/login?erro=link", origin));
}
