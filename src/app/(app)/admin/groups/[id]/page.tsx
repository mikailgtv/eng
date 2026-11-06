import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { getGroupById, listActiveTeachers, listStudentsInGroups } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { GroupTypeBadge, StatusBadge } from "@/components/ui/badge";
import { GroupFormTrigger } from "@/components/admin/groups/group-form-trigger";
import { MembersManager } from "@/components/admin/groups/members-manager";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Group details" };

/** ADMIN — group details + member management (assign / remove students). */
export default async function AdminGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(["ADMIN"]);
  const group = await getGroupById(id);

  if (!group) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <EmptyState
            icon={ArrowLeft}
            title="Group not found."
            description="This group may have been removed or the link is incorrect."
            action={
              <Link href="/admin/groups">
                <Button variant="secondary" size="sm">Back to groups</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const [members, teachers] = await Promise.all([
    listStudentsInGroups([group.id], {}),
    listActiveTeachers(),
  ]);

  return (
    <div>
      <Link
        href="/admin/groups"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to groups
      </Link>

      <PageHeader
        title={group.name}
        description={group.description ?? undefined}
        actions={<GroupFormTrigger teachers={teachers} group={group} label="Edit group" variant="secondary" />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
        <GroupTypeBadge type={group.type} />
        <StatusBadge status={group.status} />
        <span>
          Lead teacher:{" "}
          <span className="font-medium text-foreground">
            {group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : "Not assigned"}
          </span>
        </span>
        <span>Created <span className="font-medium text-foreground">{formatDate(group.createdAt)}</span></span>
      </div>

      <MembersManager group={{ id: group.id, name: group.name }} members={members} />
    </div>
  );
}
