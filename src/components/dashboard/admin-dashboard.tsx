import Link from "next/link";
import { Activity, GraduationCap, Layers, UserCog, Users } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { GroupTypeBadge, StatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { AuditEntry, GroupWithMeta } from "@/types";
import { MobileShortcuts } from "@/components/layout/mobile-shortcuts";

/**
 * ADMIN dashboard — every number is a live database value. When there is no
 * data it shows zeros and honest empty states (no fake content).
 */
export function AdminDashboard({
  stats,
  groups,
  recentAudit,
}: {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    activeGroups: number;
    totalUsers: number;
    inactiveUsers: number;
  };
  groups: GroupWithMeta[];
  recentAudit: AuditEntry[];
}) {
  return (
    <div>
      <MobileShortcuts items={[
        { href: "/admin/users", label: "Users" },
        { href: "/admin/organization", label: "Organization" },
        { href: "/admin/groups", label: "Groups" },
        { href: "/admin/content", label: "Content" },
        { href: "/admin/reports", label: "Reports" },
        { href: "/admin/certificates", label: "Certificates" },
        { href: "/admin/security", label: "Security" },
        { href: "/admin/roles", label: "Roles" },
      ]} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Administration</h1>
          <p className="mt-1 text-sm text-muted">System overview across all learning groups.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="secondary" size="sm">
              <Users className="h-4 w-4" aria-hidden /> Manage users
            </Button>
          </Link>
          <Link href="/admin/groups">
            <Button size="sm">
              <Layers className="h-4 w-4" aria-hidden /> Manage groups
            </Button>
          </Link>
        </div>
      </header>

      {/* KPIs — real database values */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={stats.totalStudents} icon={GraduationCap} href="/admin/students" />
        <StatCard label="Teachers" value={stats.totalTeachers} icon={UserCog} href="/admin/teachers" />
        <StatCard label="Active groups" value={stats.activeGroups} icon={Layers} href="/admin/groups" />
        <StatCard
          label="Total users"
          value={stats.totalUsers}
          icon={Users}
          href="/admin/users"
          hint={stats.inactiveUsers > 0 ? `${stats.inactiveUsers} inactive` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Group overview — the five initial organizational groups */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Learning groups</CardTitle>
            <Link href="/admin/groups" className="text-[13px] font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          {groups.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No learning groups yet."
              description="Create your first group to start organizing students."
              className="py-8"
            />
          ) : (
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {groups.map((group) => (
                  <li key={group.id}>
                    <Link
                      href={`/admin/groups/${group.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          <GroupTypeBadge type={group.type} />
                          {group.teacher ? `Lead: ${group.teacher.firstName} ${group.teacher.lastName}` : "No lead teacher"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[13px] tabular-nums text-muted">
                          {group._count.members} {group._count.members === 1 ? "member" : "members"}
                        </span>
                        <StatusBadge status={group.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>

        {/* Recent administrative activity (real audit entries) */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent admin activity</CardTitle>
            <Link href="/admin/settings" className="text-[13px] font-medium text-primary hover:underline">
              Audit log
            </Link>
          </CardHeader>
          {recentAudit.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity."
              description="Administrative actions (user created, group updated, role changed…) will appear here."
              className="py-8"
            />
          ) : (
            <CardBody className="p-0">
              <ul className="divide-y divide-border">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <p className="text-[13px] text-foreground">
                      <span className="font-medium">{auditActionLabel(entry.action)}</span>
                      {entry.actor && <span className="text-muted"> · {entry.actor.firstName} {entry.actor.lastName}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(entry.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    USER_CREATED: "User created",
    USER_UPDATED: "User updated",
    USER_DEACTIVATED: "User deactivated",
    USER_ACTIVATED: "User activated",
    ROLE_CHANGED: "Role changed",
    GROUP_CREATED: "Group created",
    GROUP_UPDATED: "Group updated",
    GROUP_DEACTIVATED: "Group deactivated",
    GROUP_ACTIVATED: "Group activated",
    MEMBER_ASSIGNED: "Student assigned to group",
    MEMBER_REMOVED: "Student removed from group",
  };
  return labels[action] ?? action.replaceAll("_", " ").toLowerCase();
}
