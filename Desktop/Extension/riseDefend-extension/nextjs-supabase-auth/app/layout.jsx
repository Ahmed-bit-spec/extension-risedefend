import SessionManager from "@/components/SessionManager";

/**
 * Root Layout — Server Component
 *
 * Required by Next.js App Router. Every page is rendered inside this layout.
 *
 * SessionManager is mounted here so it exists on every page and maintains
 * a single, global auth-state listener for the lifetime of the app session.
 * It renders no visible UI — it only handles navigation side-effects.
 */
export const metadata = {
  title: "RiseDefend",
  description: "RiseDefend content protection — manage your account",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/*
          SessionManager lives outside {children} so it survives page
          transitions and never gets unmounted/remounted during navigation.
        */}
        <SessionManager />
        {children}
      </body>
    </html>
  );
}
