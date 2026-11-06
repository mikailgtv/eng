import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "User not found" };

/**
 * Rendered for /admin/users/<unknown id>. `notFound()` in the page now returns a
 * real 404; this keeps the exact in-shell empty state users already saw, instead
 * of the generic "Page not found" screen.
 */
export default function AdminUserNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <EmptyState
          icon={UsersRound}
          title="User not found."
          description="This account may have been removed or the link is incorrect."
          action={
            <Link href="/admin/users">
              <Button variant="secondary" size="sm">
                Back to users
              </Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
