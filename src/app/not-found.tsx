import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const user = await getSessionUser();
  const home = user ? ROLE_HOME[user.role] ?? "/" : "/login";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/10">
          <Compass className="h-6 w-6 text-muted" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link href={home} className="mt-6 inline-block">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
