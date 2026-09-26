import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

/**
 * /dashboard — Server Component
 *
 * Flow on every render:
 *  1. Create the server Supabase client (cookie-based session).
 *  2. Call getUser() — validates JWT against Supabase Auth servers.
 *  3. Redirect unauthenticated visitors to /login.
 *  4. Upsert the user into public.users with their username from user_metadata.
 *  5. Fetch the stored display_name and render the dashboard.
 */
export default async function DashboardPage() {
  console.log("[dashboard] rendering — creating Supabase server client");
  const supabase = await createClient();

  // ── 1. Authentication check ──────────────────────────────────────────────
  console.log("[dashboard] calling getUser() for server-side auth verification");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[dashboard] getUser() error:", authError.message);
  }

  if (!user) {
    console.warn("[dashboard] no authenticated user — redirecting to /login");
    redirect("/login");
  }

  console.log("[dashboard] authenticated user:", user.id, "| email:", user.email);

  // ── 2. Resolve display name ──────────────────────────────────────────────
  // Priority: username from signup metadata → full_name → email → Anonymous
  const displayName =
    user.user_metadata?.username ??   // set during email/password signup
    user.user_metadata?.full_name ??  // set by Google OAuth (kept for compat)
    user.user_metadata?.name ??
    user.email ??
    "Anonymous";

  // ── 3. Upsert user into public.users ────────────────────────────────────
  //   ignoreDuplicates: true — no-op if row already exists (never overwrites).
  console.log("[dashboard] upserting user into public.users | display_name:", displayName);
  const { error: upsertError } = await supabase
    .from("users")
    .upsert(
      {
        id:           user.id,
        display_name: displayName,
        email:        user.email,
      },
      {
        onConflict:       "id",
        ignoreDuplicates: true,
      }
    );

  if (upsertError) {
    console.error("[dashboard] upsert error:", upsertError.message);
  } else {
    console.log("[dashboard] upsert successful (or row already existed)");
  }

  // ── 4. Fetch stored profile ──────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[dashboard] profile fetch error:", profileError.message);
  }

  const storedName = profile?.display_name ?? displayName;

  // ── 5. Render ────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">RiseDefend</span>
        </div>
        <SignOutButton />
      </nav>

      {/* ── Content ── */}
      <section className="mx-auto mt-16 w-full max-w-2xl px-4">
        <div className="rounded-2xl bg-white p-8 shadow-md border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {storedName}!
          </h1>
          <p className="mt-2 text-sm text-gray-500">{profile?.email ?? user.email}</p>

          <hr className="my-6 border-gray-200" />

          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <span className="font-medium">User ID:</span>{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                {user.id}
              </code>
            </li>
            <li>
              <span className="font-medium">Username:</span> {storedName}
            </li>
            <li>
              <span className="font-medium">Email:</span> {user.email}
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
