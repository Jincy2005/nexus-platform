import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PREFIXES = [
  "/",
  "/about",
  "/features",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/auth",
];

const AUTH_PAGES = ["/sign-in", "/sign-up", "/reset-password"];

export function isPublicPath(pathname: string) {
  if (PUBLIC_PREFIXES.includes(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/profile/")) return true;
  if (pathname.startsWith("/post/")) return true;
  if (pathname.startsWith("/community/")) return true;
  if (pathname.startsWith("/job/")) return true;
  if (pathname.startsWith("/event/")) return true;
  if (pathname.startsWith("/organization/")) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.some((path) => pathname.startsWith(path));
  const requiresAuth =
    !isPublicPath(pathname) ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/bookmarks") ||
    pathname.startsWith("/feed") ||
    pathname.startsWith("/network");

  if (!user && requiresAuth && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return response;
}
