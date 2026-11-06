import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { teacherDesk } from "@/lib/certificates/service";
import { ApprovalForm } from "@/components/certificates/forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificates" };

export default async function TeacherCertificatesPage({ searchParams: rawSearchParams }: { searchParams: Promise<{ groupId?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const desk = await teacherDesk(user, searchParams.groupId);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Certificates</h1>
      <p className="mt-1 text-sm text-muted">Students in your groups, in alphabetical order. This is not a ranking. You can record an official approval. You cannot issue, revoke, or change an exam score here.</p>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {desk.groups.map((group) => (
          <li key={group.id}><Link className={group.id === desk.selected ? "font-semibold underline" : "underline"} href={`/teacher/certificates?groupId=${group.id}`}>{group.name}</Link></li>
        ))}
      </ul>
      {desk.rows.length === 0 && <p className="mt-4 text-sm text-muted">No assigned students or courses yet.</p>}
      <div className="mt-4 space-y-3">
        {desk.rows.map((row) => {
          const missing = row.requirements.filter((item) => item.status === "MISSING");
          return (
            <section key={`${row.studentId}-${row.courseId}`} className="rounded-xl border border-border p-3 text-sm">
              <h2 className="font-semibold">{row.studentName} · {row.courseTitle}</h2>
              <p>Status: {row.status.replaceAll("_", " ")}. Eligible: {row.eligible ? "Yes" : "No"}.</p>
              <p>{row.statusDefinition}</p>
              {missing.length === 0 ? <p>No official requirement is missing.</p> : (
                <ul className="mt-2 list-disc pl-5">
                  {missing.map((item) => <li key={item.key}>{item.requirement}. {item.missingAction}</li>)}
                </ul>
              )}
              <p className="mt-1 text-xs text-muted">{row.attendance.note}</p>
            </section>
          );
        })}
      </div>
      <section className="mt-6 rounded-2xl border border-border p-4">
        <h2 className="font-semibold">Official approval</h2>
        <p className="mt-1 text-sm text-muted">This is a teacher decision. It is not an AI grade and it does not change an exam attempt.</p>
        <div className="mt-3">
          <ApprovalForm students={desk.students ?? []} courses={desk.courses ?? []} />
        </div>
      </section>
      <p className="mt-4 text-sm"><Link className="underline" href="/teacher/reports">Certificate reports</Link></p>
    </div>
  );
}
