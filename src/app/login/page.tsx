import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import { safeInternalPath } from "@/lib/utils";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

interface LoginPageProps {
  searchParams?: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Already signed in? Straight to the role home.
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role] ?? "/dashboard");

  const resolvedSearchParams = await searchParams;
  const nextParam = typeof resolvedSearchParams?.next === "string" ? resolvedSearchParams.next : undefined;
  const next = safeInternalPath(nextParam, "");
  const showDemoHints = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_HINTS === "true";
  const demoAccounts = showDemoHints
    ? (await import("@/lib/dev-demo-accounts")).developmentDemoAccounts
    : [];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <LoginForm nextPath={next} showDemoHints={showDemoHints} demoAccounts={demoAccounts} />
    </main>
  );
}
