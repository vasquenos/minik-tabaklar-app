import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// E-posta onay / OAuth geri dönüş adresi.
// Kod "code" parametresiyle gelir; session'a çevrilir.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/recipes";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
