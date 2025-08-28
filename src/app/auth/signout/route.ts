import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  // Create the redirect response first; we'll attach cookie updates to it
  const response = NextResponse.redirect(new URL("/", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "pkce" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Perform sign-out and ensure cookies cleared on the same response
  await supabase.auth.signOut();

  // Proactively delete any lingering Supabase auth cookies for current/old refs
  const incomingCookies = request.cookies.getAll();
  const authCookiePattern = /sb-[a-z0-9]+-auth-token(\.[0-9]+)?/i;
  const legacyPatterns = [
    /sb-[a-z0-9]+-access-token/i,
    /sb-[a-z0-9]+-refresh-token/i,
  ];
  for (const c of incomingCookies) {
    if (
      authCookiePattern.test(c.name) ||
      legacyPatterns.some((rx) => rx.test(c.name))
    ) {
      response.cookies.set(c.name, "", {
        path: "/",
        expires: new Date(0),
      });
    }
  }

  return response;
}
