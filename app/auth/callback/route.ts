import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// E-posta onay / OAuth geri dönüş adresi.
// Kod "code" parametresiyle gelir; session'a çevrilir, kullanıcıya
// "doğrulandı" mesajı gösterilir ve uygulamaya yönlendirilir.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/recipes";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const target = `${origin}${next}`;
      const html = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>E-posta doğrulandı</title>
    <script>
      setTimeout(function () {
        window.location.replace(${JSON.stringify(target)});
      }, 1500);
    </script>
  </head>
  <body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#faf8f5;color:#2d2529;font-family:ui-sans-serif,system-ui,sans-serif">
    <div style="text-align:center;padding:24px">
      <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:999px;background:#f8c8dc;display:flex;align-items:center;justify-content:center;font-size:26px;color:#2d2529">✓</div>
      <h1 style="font-size:20px;margin:0 0 8px">E-posta doğrulandı!</h1>
      <p style="font-size:14px;color:#7a6d76;margin:0">Uygulamaya yönlendiriliyorsun...</p>
    </div>
  </body>
</html>`;
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
