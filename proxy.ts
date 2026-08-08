import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Optimistic route guard (Next 16'da middleware yerine proxy).
// Gerçek güvenlik: her sayfa/server action RLS + getUser() ile doğrular.
const protectedPaths = [
  "/recipes",
  "/discover",
  "/favorites",
  "/friends",
  "/profile",
  "/notifications",
  "/users",
  "/admin",
];
const authPaths = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // IMPORTANT: createServerClient ile getUser() arasına kod yazılmaz.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((prefix) => path.startsWith(prefix));
  const isAuthPage = authPaths.some((prefix) => path.startsWith(prefix));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((isAuthPage || path === "/") && user) {
    return NextResponse.redirect(new URL("/recipes", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
