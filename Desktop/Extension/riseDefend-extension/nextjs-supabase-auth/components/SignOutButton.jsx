"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * SignOutButton — Client Component
 *
 * Signs the user out via Supabase (clears cookies) and then
 * uses the Next.js router to navigate to /login.
 * `router.refresh()` ensures server components re-render without
 * the now-invalid session.
 */
export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      Sign out
    </button>
  );
}
