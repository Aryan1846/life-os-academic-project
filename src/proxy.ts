import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const isConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseAnonKey.includes("placeholder");

  // In production, missing credentials MUST fail securely (fail closed)
  if (!isConfigured) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        JSON.stringify({ error: "Service unavailable: Authentication infrastructure unconfigured." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    // In local dev without Supabase configured yet, permit viewing public pages and baseline
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route classifications
  const isAuthPage =
    path === "/login" ||
    path === "/register" ||
    path === "/forgot-password" ||
    path === "/reset-password";

  const isPublicRoute =
    path === "/" ||
    isAuthPage ||
    path.startsWith("/api/auth");

  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/api/admin");

  let activeProfile: { role: string; is_active: boolean } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
    activeProfile = data;
    if (!activeProfile?.is_active) {
      await supabase.auth.signOut();
      if (path.startsWith("/api/")) return NextResponse.json({ error: "Account inactive" }, { status: 403 });
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (activeProfile.role !== "admin" && !isPublicRoute) {
      const { data: maintenance } = await supabase.from("system_settings").select("value").eq("key", "maintenance_mode").maybeSingle();
      if (maintenance?.value === true) return NextResponse.json({ error: "Life OS is temporarily in maintenance mode" }, { status: 503 });
    }
  }

  // 1. Unauthenticated users trying to access protected routes
  if (!user && !isPublicRoute) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated users trying to access login/register
  if (user && isAuthPage) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 3. Strict Admin Authorization Check
  if (isAdminRoute) {
    if (!user) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (activeProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Administrative privileges required." },
        { status: 403 }
      );
    }
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
