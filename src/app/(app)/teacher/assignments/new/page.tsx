import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer } from "@/lib/teaching/queries";
import { AssignmentForm } from "@/components/teaching/assignment-form";

export const metadata: Metadata = { title: "New assignment" };

export default async function NewAssignmentPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const groups = await groupsForViewer({ id: user.id, role: user.role, groupId: user.groupId });
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Create assignment</h1>
      {groups.length === 0 ? <p className="text-sm text-muted">You have no assigned groups.</p> : <AssignmentForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} />}
    </div>
  );
}
