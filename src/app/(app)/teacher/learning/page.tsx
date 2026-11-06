import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer } from "@/lib/teaching/queries";
import { teacherBoard } from "@/lib/adaptive/service";
import { OverrideForm } from "@/components/adaptive/override-form";

export const metadata: Metadata = { title: "Learning plans" };

const HEADINGS = ["Needs Review", "Low recent activity", "No practice recorded yet", "High error frequency", "Strong recent performance"] as const;

export default async function TeacherLearningPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const [groups, board] = await Promise.all([groupsForViewer(viewer), teacherBoard(viewer)]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Learning plans</h1>
      <p className="mt-1 text-sm text-muted">Descriptive summaries from recorded practice. Students are not ranked. Groups are not ranked.</p>
      <OverrideForm groups={groups.map((group) => ({ id: group.id, name: group.name }))} />
      {HEADINGS.map((heading) => {
        const rows = board.filter((student) => student.labels.includes(heading));
        return (
          <section key={heading} className="mt-6">
            <h2 className="text-sm font-semibold">{heading}</h2>
            {rows.length === 0 ? <p className="mt-1 text-sm text-muted">None in your groups.</p> : (
              <ul className="mt-2 space-y-1">
                {rows.map((student) => (
                  <li key={`${heading}-${student.id}`}>
                    <Link href={`/teacher/learning/${student.id}`} className="block rounded-lg border border-border px-3 py-2 text-sm">
                      {student.name} · {student.group}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
