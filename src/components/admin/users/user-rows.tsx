"use client";

import { Avatar } from "@/components/ui/avatar";
import { LevelBadge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { UserRowActions } from "@/components/admin/users/user-row-actions";
import { fullName, formatDateTime } from "@/lib/utils";
import type { GroupOption, SafeUser } from "@/types";

interface UserRowsProps {
  users: SafeUser[];
  groups: GroupOption[];
  viewerId: string;
  /** "table" (desktop) | "cards" (mobile) — same data, responsive presentation. */
  layout: "table" | "cards";
  /** Role lock from Teachers/Students pages (keeps row dialogs consistent). */
  lockedRole?: "TEACHER" | "STUDENT";
}

/**
 * User list presentation shared by /admin/users, /admin/teachers,
 * /admin/students. Rendered twice per page (table for md+, cards below md)
 * from the same server data — tables never overflow on small screens.
 */
export function UserRows({ users, groups, viewerId, layout, lockedRole }: UserRowsProps) {
  if (layout === "table") {
    return (
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/5 text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-5 py-3 font-medium">User</th>
            <th scope="col" className="px-4 py-3 font-medium">Role</th>
            <th scope="col" className="px-4 py-3 font-medium">Group</th>
            <th scope="col" className="px-4 py-3 font-medium">Level</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Last sign-in</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/70 last:border-0 hover:bg-muted/5">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar person={u} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{fullName(u)}</p>
                    <p className="truncate text-xs text-muted">
                      {u.username} · <span className="tabular-nums">{u.employeeCode}</span>
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
              <td className="px-4 py-3 text-muted">{u.group?.name ?? "—"}</td>
              <td className="px-4 py-3"><LevelBadge level={u.englishLevel} /></td>
              <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
              <td className="px-5 py-3">
                <UserRowActions user={u} groups={groups} viewerId={viewerId} lockedRole={lockedRole} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <li key={u.id} className="p-4">
          <div className="flex items-start gap-3">
            <Avatar person={u} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{fullName(u)}</p>
              <p className="truncate text-xs text-muted">
                {u.username} · <span className="tabular-nums">{u.employeeCode}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <RoleBadge role={u.role} />
                <StatusBadge status={u.status} />
                <LevelBadge level={u.englishLevel} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {u.group ? `Group: ${u.group.name}` : "No group"} ·{" "}
                {u.lastLoginAt ? `Last sign-in ${formatDateTime(u.lastLoginAt)}` : "Never signed in"}
              </p>
            </div>
            <UserRowActions user={u} groups={groups} viewerId={viewerId} lockedRole={lockedRole} />
          </div>
        </li>
      ))}
    </ul>
  );
}
