"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import type { GroupOption } from "@/types";
import { ROLES, roleLabel } from "@/lib/constants";

interface UsersFiltersProps {
  role?: string;
  groupId?: string;
  status?: string;
  groups: GroupOption[];
  /** Hide the role filter (used on /admin/teachers and /admin/students). */
  lockedRole?: string;
  basePath: string;
  q?: string;
}

/** Filter selects that write to the URL — server re-renders the list. */
export function UsersFilters({ role, groupId, status, groups, lockedRole, basePath, q }: UsersFiltersProps) {
  const router = useRouter();

  function buildHref(changes: { role?: string; groupId?: string; status?: string }) {
    const params = new URLSearchParams();
    const next = { role, groupId, status, ...changes };
    if (q) params.set("q", q);
    if (next.role) params.set("role", next.role);
    if (next.groupId) params.set("groupId", next.groupId);
    if (next.status) params.set("status", next.status);
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  const selectClass = "h-10 w-full min-w-0 sm:w-auto sm:min-w-36";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {!lockedRole && (
        <Select aria-label="Filter by role" value={role ?? ""} onChange={(e) => buildHref({ role: e.target.value })} className={selectClass}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel(r)}</option>
          ))}
        </Select>
      )}
      <Select aria-label="Filter by group" value={groupId ?? ""} onChange={(e) => buildHref({ groupId: e.target.value })} className={selectClass}>
        <option value="">All groups</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </Select>
      <Select aria-label="Filter by status" value={status ?? ""} onChange={(e) => buildHref({ status: e.target.value })} className={selectClass}>
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </Select>
    </div>
  );
}
