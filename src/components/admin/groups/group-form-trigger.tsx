"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupFormDialog } from "@/components/admin/groups/group-form-dialog";
import type { GroupWithMeta } from "@/types";
import type { TeacherOption } from "@/components/admin/groups/group-form-dialog";

/** Button + dialog pair for creating/editing a group. */
export function GroupFormTrigger({
  teachers,
  label = "Create group",
  variant = "primary",
  group,
}: {
  teachers: TeacherOption[];
  label?: string;
  variant?: "primary" | "secondary";
  group?: GroupWithMeta;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {!group && <Plus className="h-4 w-4" aria-hidden />} {label}
      </Button>
      <GroupFormDialog open={open} onClose={() => setOpen(false)} teachers={teachers} group={group} />
    </>
  );
}
