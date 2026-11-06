import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/teaching/access";
import { attendanceSummary } from "@/lib/teaching/queries";
import { NoteForm } from "@/components/teaching/note-form";
import { formatDate, formatDateTime, fullName } from "@/lib/utils";

export const metadata: Metadata = { title: "Student" };

export default async function TeacherStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const student = await requireStudent({ id: user.id, role: user.role, groupId: user.groupId }, id).catch(() => null);
  if (!student) notFound();

  const [progress, quizzes, exams, attendance, notes, assignments] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { studentId: student.id },
      include: { lesson: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.assessmentAttempt.findMany({
      where: { studentId: student.id, assessment: { type: "QUIZ" }, status: { in: ["GRADED", "EXPIRED"] } },
      include: { assessment: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
      take: 6,
    }),
    prisma.assessmentAttempt.findMany({
      where: { studentId: student.id, assessment: { type: "EXAM" }, status: { in: ["GRADED", "EXPIRED"] } },
      include: { assessment: { select: { title: true } } },
      orderBy: { submittedAt: "desc" },
      take: 6,
    }),
    attendanceSummary([student.id]),
    prisma.teacherNote.findMany({
      where: { studentId: student.id, visibility: "TEACHER_ONLY" },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId: student.id },
      include: { assignment: { select: { title: true, dueAt: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);
  const att = attendance.get(student.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <p className="text-xs text-muted"><Link href="/teacher/students" className="underline">Students</Link></p>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{fullName(student)}</h1>
        <p className="mt-1 text-sm text-muted">
          {student.employeeCode ?? "No employee code"} · {student.group?.name ?? "No group"} · {student.status === "ACTIVE" ? "Active" : "Inactive"}
        </p>
      </header>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Attendance" value={att?.percent === null || att?.percent === undefined ? "—" : `${att.percent}%`} />
        <Fact label="Present" value={String(att?.present ?? 0)} />
        <Fact label="Absent" value={String(att?.absent ?? 0)} />
        <Fact label="Late" value={String(att?.late ?? 0)} />
      </section>
      <Section title="Learning">
        {progress.length === 0 ? <p className="text-sm text-muted">No lesson progress yet.</p> : (
          <ul className="space-y-1 text-sm">{progress.map((p) => <li key={p.id}>{p.lesson.title} · {p.status === "COMPLETED" ? "Completed" : "In progress"}</li>)}</ul>
        )}
      </Section>
      <Section title="Quizzes">
        {quizzes.length === 0 ? <p className="text-sm text-muted">No quiz attempts.</p> : (
          <ul className="space-y-1 text-sm">{quizzes.map((q) => <li key={q.id}>{q.assessment.title} · {q.percentage ?? "—"}% · {q.passed ? "Passed" : "Not passed"}</li>)}</ul>
        )}
      </Section>
      <Section title="Exams">
        {exams.length === 0 ? <p className="text-sm text-muted">No exam attempts. Exam scores are official and cannot be edited here.</p> : (
          <ul className="space-y-1 text-sm">{exams.map((q) => <li key={q.id}>{q.assessment.title} · {q.percentage ?? "—"}% · {q.passed ? "Passed" : "Not passed"}</li>)}</ul>
        )}
      </Section>
      <Section title="Assignments">
        {assignments.length === 0 ? <p className="text-sm text-muted">No assignment submissions.</p> : (
          <ul className="space-y-1 text-sm">{assignments.map((a) => <li key={a.id}>{a.assignment.title} · {a.status} · due {formatDate(a.assignment.dueAt)}</li>)}</ul>
        )}
      </Section>
      <Section title="Private notes">
        <p className="mb-2 text-xs text-muted">Students never see these notes.</p>
        <NoteForm scope="STUDENT" studentId={student.id} groupId={student.groupId ?? undefined} />
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p>{n.content}</p>
              <p className="mt-1 text-xs text-muted">{n.author.firstName} {n.author.lastName} · {formatDateTime(n.createdAt)}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-2 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}
