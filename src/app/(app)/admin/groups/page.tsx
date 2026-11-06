import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { listActiveTeachers, listGroups } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupTypeBadge, StatusBadge } from "@/components/ui/badge";
import { GroupFormTrigger } from "@/components/admin/groups/group-form-trigger";

export const metadata: Metadata = { title: "Groups" };

/** ADMIN — manage all learning groups. */
export default async function AdminGroupsPage() {
  await requirePageUser(["ADMIN"]);
  const [groups, teachers] = await Promise.all([listGroups(), listActiveTeachers()]);

  return (
    <div>
      <PageHeader
        title="Learning groups"
        description="Organizational groups (shifts, departments) that students belong to. One centralized system — groups are labels, not separate spaces."
        actions={<GroupFormTrigger teachers={teachers} label="Create group" />}
      />

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="No learning groups yet."
            description="Create your first group — for example “Firefighter Shift A” — to start organizing students."
            action={<GroupFormTrigger teachers={teachers} label="Create group" variant="secondary" />}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/admin/groups/${group.id}`} className="block h-full">
                <Card className="h-full transition-shadow hover:shadow-card-hover">
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-semibold text-foreground">{group.name}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <GroupTypeBadge type={group.type} />
                          <StatusBadge status={group.status} />
                        </div>
                      </div>
                    </div>
                    {group.description && (
                      <p className="mt-2.5 line-clamp-2 text-[13px] leading-5 text-muted">{group.description}</p>
                    )}
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[13px]">
                      <div>
                        <dt className="text-xs text-muted">Students</dt>
                        <dd className="font-semibold tabular-nums text-foreground">{group._count.members}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-muted">Lead teacher</dt>
                        <dd className="truncate font-medium text-foreground">
                          {group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : "—"}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 flex items-center gap-1 text-[13px] font-medium text-primary">
                      <Plus className="h-3.5 w-3.5 rotate-45" aria-hidden /> Manage members
                    </p>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
