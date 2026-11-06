import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access denied" };

/** 403 page — shown when a signed-in user opens another role's workspace. */
export default async function UnauthorizedPage() {
  const user = await getSessionUser();
  const home = user ? ROLE_HOME[user.role] ?? "/" : "/login";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-subtle">
          <ShieldAlert className="h-6 w-6 text-danger" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your account does not have permission to view this page. If you believe this is a mistake,
          please contact your system administrator.
        </p>
        <Link href={home} className="mt-6 inline-block">
          <Button>Go to my dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
