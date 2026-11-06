"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Power } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { GroupOption, SafeUser } from "@/types";
import { UserFormDialog } from "@/components/admin/users/user-form-dialog";

interface UserRowActionsProps {
  user: SafeUser;
  groups: GroupOption[];
  /** Id of the signed-in admin — the admin cannot deactivate themselves. */
  viewerId: string;
  lockedRole?: "TEACHER" | "STUDENT";
}

/** Per-row actions: open profile, edit, quick activate/deactivate (with confirmation). */
export function UserRowActions({ user, groups, viewerId, lockedRole }: UserRowActionsProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const deactivating = user.status === "ACTIVE";
  const isSelf = user.id === viewerId;

  async function toggleStatus() {
    setBusy(true);
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: { status: deactivating ? "INACTIVE" : "ACTIVE" },
      });
      notify("success", deactivating ? "User deactivated." : "User activated.");
      setToggleOpen(false);
      router.refresh();
    } catch (err) {
      notify("error", err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const profileHref = `/admin/users/${user.id}`;

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={profileHref}
        className="rounded-md px-2 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary-subtle/60"
      >
        View
      </Link>
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label={`Edit ${user.firstName} ${user.lastName}`}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setToggleOpen(true)}
        disabled={isSelf}
        title={isSelf ? "You cannot deactivate your own account" : undefined}
        aria-label={deactivating ? `Deactivate ${user.firstName} ${user.lastName}` : `Activate ${user.firstName} ${user.lastName}`}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-muted/10 hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent"
      >
        <Power className="h-4 w-4" aria-hidden />
      </button>

      <UserFormDialog open={editOpen} onClose={() => setEditOpen(false)} groups={groups} user={user} lockedRole={lockedRole} />

      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={toggleStatus}
        title={deactivating ? "Deactivate user?" : "Activate user?"}
        danger={deactivating}
        busy={busy}
        confirmLabel={deactivating ? "Deactivate" : "Activate"}
        message={
          deactivating ? (
            <>
              <span className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>{" "}
              will no longer be able to sign in. Their account and data are kept — this is a soft
              deactivation, not a deletion.
            </>
          ) : (
            <>
              Reactivate <span className="font-medium text-foreground">{user.firstName} {user.lastName}</span> so they can
              sign in again?
            </>
          )
        }
      />
    </div>
  );
}
