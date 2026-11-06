import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer } from "@/lib/teaching/queries";
import { teacherEngagement } from "@/lib/gamification/service";
import { ChallengeForm } from "@/components/gamification/challenge-form";

export const metadata: Metadata = { title: "Engagement" };

export default async function TeacherEngagementPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const [groups, board] = await Promise.all([groupsForViewer(viewer), teacherEngagement(viewer)]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Engagement</h1>
      <p className="mt-1 text-sm text-muted">Counts for your groups. Students are not ranked. Shifts are not ranked. Learning Level is not an English level.</p>
      <ChallengeForm groups={groups.map((group) => ({ id: group.id, name: group.name }))} />
      <ul className="mt-6 space-y-3">
        {board.map((group) => (
          <li key={group.id} className="rounded-2xl border border-border px-4 py-3 text-sm">
            <p className="font-medium">{group.name}</p>
            <p>{group.activeLearners} of {group.students} students finished at least one activity this week.</p>
            <p>{group.activities} finished activities. {group.lessons} lessons completed.</p>
            {group.flaggedForReview > 0 && <p>{group.flaggedForReview} ledger{group.flaggedForReview === 1 ? "" : "s"} flagged for review. This is not a penalty.</p>}
            {group.groupChallenge && <p>Group total: {group.groupChallenge.title} · {group.groupChallenge.progress} / {group.groupChallenge.target}</p>}
          </li>
        ))}
        {board.length === 0 && <li className="text-sm text-muted">No assigned group.</li>}
      </ul>
    </div>
  );
}
