import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Base response object that Supabase cookie setter will mutate
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          // Ensure cookies are applied to the current response object
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Handle verification code from Supabase arriving at root (e.g., /?code=...)
  const code = request.nextUrl.searchParams.get("code");
  if (request.nextUrl.pathname === "/" && code) {
    const target = new URL("/reset-password", request.url);
    target.searchParams.set("code", code);
    response = NextResponse.redirect(target);
    // Also perform server-side exchange to set cookies immediately
    await supabase.auth.exchangeCodeForSession(code);
    return response;
  }

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If coming from Supabase recovery verification, force reset page
  const referer = request.headers.get("referer") || "";
  if (
    referer.includes("/auth/v1/verify") ||
    request.nextUrl.searchParams.get("type") === "recovery"
  ) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  // Define protected routes
  const protectedRoutes = ["/dashboard", "/budget", "/income", "/expenses"];
  const authRoutes = ["/login", "/register"];
  const publicRoutes = [
    "/",
    "/auth/callback",
    "/reset-password",
    "/auth/signout",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If the URL itself includes type=recovery (e.g., proxied params), route to reset
  if (request.nextUrl.searchParams.get("type") === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  // Redirect logic
  if (isProtectedRoute && !user) {
    // Redirect to login if trying to access protected route without authentication
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    // Redirect to dashboard if trying to access auth routes while authenticated
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow public routes to pass through
  if (isPublicRoute) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
