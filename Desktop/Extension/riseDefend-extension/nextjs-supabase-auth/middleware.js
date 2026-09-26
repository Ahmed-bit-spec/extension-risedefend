import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Middleware runs on every request and is responsible for:
 *  1. Refreshing the user's session cookie (keeps them logged in on refresh).
 *  2. Protecting routes — redirects unauthenticated users away from /dashboard.
 *  3. Redirecting already-authenticated users away from /login and /signup.
 *
 * IMPORTANT: The cookie setAll implementation must create a fresh
 * NextResponse.next() BEFORE setting cookies on it, then return that
 * same response at the end — so refreshed session tokens are propagated
 * to both the request (for server components) and the response (for the browser).
 */
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Write cookies to the cloned request so server components can
          //    read the refreshed session immediately.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Create a fresh response with the updated request so the
          //    refreshed session is forwarded correctly.
          supabaseResponse = NextResponse.next({ request });
          // 3. Write the same cookies (with full options) to the response
          //    so the browser stores the refreshed tokens.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT add any logic between createServerClient and
  // getUser(). A single await getUser() call is required to refresh
  // the session cookie correctly.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  /**
   * Helper: redirect while preserving any cookies that were freshly set
   * during the getUser() call above (e.g. a token refresh just happened).
   * Without copying cookies here those tokens would be silently discarded.
   */
  const createRedirectResponse = (targetUrl) => {
    const redirectResponse = NextResponse.redirect(targetUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // ── Root path ────────────────────────────────────────────────────────────
  if (pathname === "/") {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = user ? "/dashboard" : "/login";
    return createRedirectResponse(targetUrl);
  }

  // ── Protect /dashboard ───────────────────────────────────────────────────
  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return createRedirectResponse(loginUrl);
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (user && isAuthPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return createRedirectResponse(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimization)
     *   - favicon.ico
     *   - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
