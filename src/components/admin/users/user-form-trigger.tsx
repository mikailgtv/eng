"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/admin/users/user-form-dialog";
import type { GroupOption } from "@/types";

/** Button + dialog pair for creating a user (optionally role-locked). */
export function UserFormDialogTrigger({
  groups,
  label = "Create user",
  variant = "primary",
  lockedRole,
}: {
  groups: GroupOption[];
  label?: string;
  variant?: "primary" | "secondary";
  lockedRole?: "TEACHER" | "STUDENT";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden /> {label}
      </Button>
      <UserFormDialog open={open} onClose={() => setOpen(false)} groups={groups} lockedRole={lockedRole} />
    </>
  );
}
