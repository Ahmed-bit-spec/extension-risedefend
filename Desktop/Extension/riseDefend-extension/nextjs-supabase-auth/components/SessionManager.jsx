"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * SessionManager — Client Component
 *
 * Mounts once in the root layout. Maintains a single onAuthStateChange
 * subscription for the lifetime of the page.
 *
 * Navigation rules (fixed to avoid infinite redirect loops):
 *
 *  • SIGNED_IN   → push to /dashboard ONLY when currently on /login or /signup.
 *                  Do NOT navigate if already on /dashboard (prevents loop).
 *  • SIGNED_OUT  → push to /login (always — the user has explicitly signed out).
 *  • TOKEN_REFRESHED → no navigation (this fires on background token refresh;
 *                       navigating here causes unnecessary re-renders and can
 *                       interrupt the user mid-task).
 *  • INITIAL_SESSION  → used only to redirect from /login → /dashboard when a
 *                       valid session already exists at mount time.
 *                       No navigation if already on /dashboard.
 *
 * Returns null — renders no UI.
 */
export default function SessionManager() {
  const router   = useRouter();
  const pathname = usePathname();

  // Keep a mutable ref to the current pathname so the auth callback
  // always sees the latest value without needing pathname in the dep array.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Guard against Strict Mode double-invoke
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const supabase = createClient();
    console.log("[SessionManager] mounting auth state listener");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "[SessionManager] auth event:", event,
        "| session:", session ? "present" : "null",
        "| pathname:", pathnameRef.current
      );

      const currentPath = pathnameRef.current;

      switch (event) {
        case "SIGNED_IN":
          // Only redirect to dashboard when coming from the login/signup flow.
          // If the user is already on /dashboard or any other page, do nothing —
          // the server component has already validated the session via middleware.
          if (session && (currentPath === "/login" || currentPath === "/signup")) {
            console.log("[SessionManager] SIGNED_IN on auth page → navigating to /dashboard");
            router.push("/dashboard");
          }
          break;

        case "INITIAL_SESSION":
          // Fires once on mount with whatever session is currently stored.
          // Only redirect login/signup visitors who already have a session.
          if (session && (currentPath === "/login" || currentPath === "/signup")) {
            console.log("[SessionManager] INITIAL_SESSION on auth page with session → navigating to /dashboard");
            router.push("/dashboard");
          } else {
            console.log("[SessionManager] INITIAL_SESSION — no redirect needed (path:", currentPath, ")");
          }
          break;

        case "TOKEN_REFRESHED":
          // Background token refresh — do NOT navigate.
          // The refreshed token is already written to the cookie by @supabase/ssr.
          // Navigating here would cause unnecessary full re-renders.
          console.log("[SessionManager] TOKEN_REFRESHED — no navigation (background refresh)");
          break;

        case "SIGNED_OUT":
          // User explicitly signed out — always redirect to login.
          console.log("[SessionManager] SIGNED_OUT → navigating to /login");
          router.push("/login");
          break;

        default:
          // PASSWORD_RECOVERY, USER_UPDATED, etc. — no navigation needed.
          break;
      }
    });

    unsubscribeRef.current = subscription.unsubscribe;

    return () => {
      console.log("[SessionManager] unmounting, unsubscribing auth listener");
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return null;
}
