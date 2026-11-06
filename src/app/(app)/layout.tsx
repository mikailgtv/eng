import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SupportBanner } from "@/components/identity/support-banner";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Authenticated shell. The session is re-validated against the database here
 * (middleware is only the first layer) — no unauthenticated request renders
 * any app page.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/clear-session");

  return (
    <ToastProvider>
      <SupportBanner active={Boolean(user.impersonatorId)} />
      <AppShell user={user}>{children}</AppShell>
    </ToastProvider>
  );
}
