import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Used by Supabase for OAuth or magic-link flows (not for email/password,
 * which sets the session directly in the browser).
 *
 * Exchanges the one-time `code` for a real session and writes session
 * cookies via @supabase/ssr's cookie handler, then redirects to /dashboard.
 *
 * NOTE: Do NOT manually copy cookieStore cookies to the response here.
 * @supabase/ssr's createServerClient already writes the session cookies
 * when exchangeCodeForSession() is called. A second manual copy can write
 * stale/duplicate cookies that break the session on the next request.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("[auth/callback] handler invoked | origin:", origin, "| code present:", !!code, "| next:", next);

  if (!code) {
    console.error("[auth/callback] no code in request — redirecting to login with error");
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  let supabase;
  try {
    supabase = await createClient();
    console.log("[auth/callback] Supabase server client created successfully");
  } catch (clientError) {
    console.error("[auth/callback] failed to create Supabase server client:", clientError);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  console.log("[auth/callback] exchanging code for session…");
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  console.log(
    "[auth/callback] session created | user id:",
    sessionData?.session?.user?.id ?? "unknown"
  );

  // Absolute redirect — works behind a proxy too.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv    = process.env.NODE_ENV === "development";

  let redirectUrl;
  if (isLocalEnv) {
    redirectUrl = `${origin}${next}`;
  } else if (forwardedHost) {
    redirectUrl = `https://${forwardedHost}${next}`;
  } else {
    redirectUrl = `${origin}${next}`;
  }

  console.log("[auth/callback] redirecting authenticated user to:", redirectUrl);

  // @supabase/ssr has already written the session cookies via the
  // cookie handler passed to createServerClient in lib/supabase/server.js.
  // We just need to return the redirect — no manual cookie copy needed.
  return NextResponse.redirect(redirectUrl);
}
