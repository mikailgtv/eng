import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/teaching/access";
import { ClassroomControls } from "@/components/teaching/classroom";
import { SessionLessonSelector } from "@/components/teaching/session-lesson-selector";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Class" };

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const session = await requireSession({ id: user.id, role: user.role, groupId: user.groupId }, id).catch(() => null);
  if (!session) notFound();

  const [students, marks, notes, lessonOptions] = await Promise.all([
    prisma.user.findMany({
      where: { groupId: session.groupId, role: "STUDENT", status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendanceRecord.findMany({ where: { sessionId: session.id } }),
    prisma.teacherNote.findMany({
      where: { sessionId: session.id },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.lesson.findMany({
      where: {
        status: "PUBLISHED",
        module: { status: "PUBLISHED", course: { status: "PUBLISHED", assignments: { some: { groupId: session.groupId } } } },
      },
      select: {
        id: true,
        title: true,
        order: true,
        module: { select: { title: true, order: true, course: { select: { title: true, level: { select: { displayName: true, name: true } } } } } },
      },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    }),
  ]);

  const initialMarks = Object.fromEntries(marks.map((m) => [m.studentId, m.status]));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Classroom</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{session.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {session.group.name} · {session.lesson?.title ?? "No lesson linked"} · {STATUS_LABEL[session.status] ?? session.status}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label="Students" value={String(students.length)} />
        <Fact label="Scheduled" value={formatDateTime(session.scheduledStart)} />
        <Fact label="Started" value={session.actualStart ? formatDateTime(session.actualStart) : "Not started"} />
        <Fact label="Ended" value={session.actualEnd ? formatDateTime(session.actualEnd) : "Not ended"} />
      </dl>
      <div className="mt-4">
        <SessionLessonSelector
          sessionId={session.id}
          selectedLessonId={session.lessonId}
          disabled={session.status === "COMPLETED" || session.status === "CANCELLED"}
          lessons={lessonOptions.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            moduleTitle: lesson.module.title,
            courseTitle: lesson.module.course.title,
            levelLabel: lesson.module.course.level.displayName ?? lesson.module.course.level.name,
          }))}
        />
      </div>
      <div className="my-4 flex flex-wrap gap-2">
        {session.lessonId && (
          <Link href={`/teacher/courses/lessons/${session.lessonId}`} className="rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/5">
            Open lesson
          </Link>
        )}
        {session.lessonId && (
          <Link href={`/teacher/courses/lessons/${session.lessonId}?activity=1`} className="rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/5">
            Start activity
          </Link>
        )}
      </div>
      <ClassroomControls
        sessionId={session.id}
        status={session.status}
        students={students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, employeeCode: s.employeeCode }))}
        initialMarks={initialMarks}
      />
      {notes.length > 0 && (
        <section className="mt-6" aria-labelledby="saved-notes">
          <h2 id="saved-notes" className="mb-2 text-sm font-semibold">Saved notes</h2>
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <p>{n.content}</p>
                <p className="mt-1 text-xs text-muted">{n.author.firstName} {n.author.lastName} · {formatDateTime(n.createdAt)} · Teachers only</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
