import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireGroup } from "@/lib/teaching/access";
import { attendanceSummary, groupSnapshot } from "@/lib/teaching/queries";
import { formatDateTime } from "@/lib/utils";
import { NoteForm } from "@/components/teaching/note-form";

export const metadata: Metadata = { title: "Group" };

const TABS = ["overview", "students", "lessons", "attendance", "assignments", "exams", "progress", "schedule", "reports"] as const;

export default async function TeacherGroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const allowed = await requireGroup(viewer, id).catch(() => null);
  if (!allowed) notFound();
  const snap = await groupSnapshot(id);
  if (!snap) notFound();
  const tab = TABS.includes(tabParam as (typeof TABS)[number]) ? tabParam! : "overview";

  const students = await prisma.user.findMany({
    where: { groupId: id, role: "STUDENT" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, status: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const attendance = await attendanceSummary(students.map((s) => s.id));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-xs text-muted"><Link href="/teacher/groups" className="underline">Groups</Link></p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{snap.group.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {students.length} students
        {snap.course ? ` · ${snap.course.title}` : " · No course"}
        {snap.course?.level ? ` · ${snap.course.level.displayName}` : ""}
        {snap.progress !== null ? ` · ${snap.progress}% average lesson progress` : ""}
      </p>
      <nav className="mt-4 flex gap-1 overflow-x-auto" aria-label="Group sections">
        {TABS.map((item) => (
          <Link
            key={item}
            href={`/teacher/groups/${id}?tab=${item}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm capitalize ${tab === item ? "bg-foreground text-surface" : "text-muted hover:bg-muted/10"}`}
          >
            {item}
          </Link>
        ))}
      </nav>
      <div className="mt-5">
        {tab === "overview" && (
          <Overview snap={snap} nextLabel={snap.nextSession ? `${snap.nextSession.title} · ${formatDateTime(snap.nextSession.scheduledStart)}` : "No upcoming class"} />
        )}
        {tab === "students" && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {students.map((s) => (
              <li key={s.id}>
                <Link href={`/teacher/students/${s.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/5">
                  <span>{s.firstName} {s.lastName}</span>
                  <span className="text-muted">{s.employeeCode ?? "—"} · {s.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                </Link>
              </li>
            ))}
            {students.length === 0 && <li className="px-4 py-6 text-sm text-muted">No students in this group.</li>}
          </ul>
        )}
        {tab === "lessons" && <LessonList snap={snap} />}
        {tab === "attendance" && <AttendanceList students={students} attendance={attendance} />}
        {tab === "assignments" && <AssignmentList groupId={id} />}
        {tab === "exams" && <ExamList courseId={snap.course?.id ?? null} />}
        {tab === "progress" && <ProgressList students={students} lessonCount={snap.lessons.length} />}
        {tab === "schedule" && <SessionList groupId={id} />}
        {tab === "reports" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Descriptive notes for this group. Students cannot see them.</p>
            <NoteForm scope="GROUP" groupId={id} />
            <SavedNotes groupId={id} />
          </div>
        )}
      </div>
    </div>
  );
}

function Overview({ snap, nextLabel }: { snap: NonNullable<Awaited<ReturnType<typeof groupSnapshot>>>; nextLabel: string }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Item label="Current course" value={snap.course?.title ?? "None assigned"} />
      <Item label="Level" value={snap.course?.level?.displayName ?? "—"} />
      <Item label="Current lesson" value={snap.current?.title ?? "No published lessons"} />
      <Item label="Next class" value={nextLabel} />
      <Item label="Average progress" value={snap.progress === null ? "No lesson progress yet" : `${snap.progress}%`} />
      <Item label="Students" value={String(snap.students)} />
    </dl>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function LessonList({ snap }: { snap: NonNullable<Awaited<ReturnType<typeof groupSnapshot>>> }) {
  if (snap.lessons.length === 0) return <p className="text-sm text-muted">No published lessons in the assigned course.</p>;
  return (
    <ul className="space-y-2">
      {snap.lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link href={`/teacher/courses/lessons/${lesson.id}`} className="block rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/5">
            <span className="font-medium">{lesson.title}</span>
            <span className="text-muted"> · {lesson.moduleTitle} · {lesson.durationMin} min</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AttendanceList({
  students,
  attendance,
}: {
  students: { id: string; firstName: string; lastName: string }[];
  attendance: Awaited<ReturnType<typeof attendanceSummary>>;
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {students.map((s) => {
        const row = attendance.get(s.id);
        return (
          <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{s.firstName} {s.lastName}</span>
            <span className="text-muted">
              {row?.percent === null || row?.percent === undefined ? "No attendance yet" : `${row.percent}% present or late`}
              {row ? ` · absent ${row.absent}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

async function AssignmentList({ groupId }: { groupId: string }) {
  const rows = await prisma.assignment.findMany({ where: { groupId }, orderBy: { dueAt: "asc" }, include: { _count: { select: { submissions: true } } } });
  if (rows.length === 0) return <p className="text-sm text-muted">No assignments for this group.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/teacher/assignments/${row.id}`} className="block rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/5">
            {row.title} · {row.status === "DRAFT" ? "Draft" : "Published"} · due {formatDateTime(row.dueAt)} · {row._count.submissions} submissions
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function ExamList({ courseId }: { courseId: string | null }) {
  if (!courseId) return <p className="text-sm text-muted">Assign a course before exams can be listed.</p>;
  const rows = await prisma.assessment.findMany({ where: { courseId, status: { not: "ARCHIVED" } }, orderBy: { createdAt: "desc" } });
  if (rows.length === 0) return <p className="text-sm text-muted">No quizzes or exams for this course.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/teacher/exams/${row.id}`} className="block rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/5">
            {row.title} · {row.type === "EXAM" ? "Exam" : "Quiz"} · {row.status}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function ProgressList({ students, lessonCount }: { students: { id: string; firstName: string; lastName: string }[]; lessonCount: number }) {
  const completed = lessonCount
    ? await prisma.lessonProgress.groupBy({
        by: ["studentId"],
        where: { studentId: { in: students.map((s) => s.id) }, status: "COMPLETED" },
        _count: true,
      })
    : [];
  const map = new Map(completed.map((c) => [c.studentId, c._count]));
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {students.map((s) => {
        const done = map.get(s.id) ?? 0;
        const percent = lessonCount ? Math.round((done / lessonCount) * 100) : null;
        return (
          <li key={s.id} className="flex justify-between px-4 py-3 text-sm">
            <span>{s.firstName} {s.lastName}</span>
            <span className="text-muted">{percent === null ? "No published lessons" : `${percent}% of published lessons`}</span>
          </li>
        );
      })}
    </ul>
  );
}

async function SessionList({ groupId }: { groupId: string }) {
  const rows = await prisma.classSession.findMany({ where: { groupId }, orderBy: { scheduledStart: "desc" }, take: 20 });
  if (rows.length === 0) return <p className="text-sm text-muted">No classes scheduled.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/teacher/classes/${row.id}`} className="block rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/5">
            {row.title} · {formatDateTime(row.scheduledStart)} · {row.status === "IN_PROGRESS" ? "In progress" : row.status === "COMPLETED" ? "Completed" : row.status === "CANCELLED" ? "Cancelled" : "Scheduled"}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function SavedNotes({ groupId }: { groupId: string }) {
  const notes = await prisma.teacherNote.findMany({
    where: { groupId, scope: "GROUP" },
    include: { author: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-2">
      {notes.map((n) => (
        <li key={n.id} className="rounded-lg border border-border px-3 py-2 text-sm">
          <p>{n.content}</p>
          <p className="mt-1 text-xs text-muted">{n.author.firstName} {n.author.lastName} · {formatDateTime(n.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
