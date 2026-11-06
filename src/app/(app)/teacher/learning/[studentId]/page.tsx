import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { studentLearningDetail } from "@/lib/adaptive/service";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { effectiveLevels } from "@/lib/learning/level-catalog";
import { LevelProfileForm } from "@/components/teacher/level-profile-form";
import { StudentOverrideForm } from "@/components/teacher/student-override-form";
import { PreviewCourseForm } from "@/components/teacher/preview-course-form";

export const metadata: Metadata = { title: "Student learning plan" };

export default async function TeacherStudentLearningPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const detail = await studentLearningDetail(user, studentId);
  const plan = detail.plan && !detail.plan.disabled ? detail.plan : null;
  const [levels, currentLevel, assignedCourses] = await Promise.all([
    effectiveLevels(detail.student.organizationId),
    detail.student.englishLevel ? prisma.level.findFirst({ where: { code: detail.student.englishLevel }, select: { order: true } }) : null,
    detail.student.groupId ? prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        level: { status: "ACTIVE", OR: [{ organizationId: detail.student.organizationId }, { organizationId: null }] },
        assignments: { some: { groupId: detail.student.groupId } },
      },
      orderBy: { level: { order: "asc" } },
      select: { id: true, title: true, level: { select: { code: true, displayName: true, order: true } } },
    }) : [],
  ]);
  const courses = assignedCourses.filter((course) => !currentLevel || course.level.order <= currentLevel.order).map((course) => ({
    id: course.id,
    title: course.title,
    levelName: course.level.displayName ?? course.level.code,
  }));
  const previewCourses = currentLevel ? assignedCourses.filter((course) => course.level.order > currentLevel.order && course.level.order === currentLevel.order + 1).map((course) => ({
    id: course.id,
    title: course.title,
    levelName: course.level.displayName ?? course.level.code,
  })) : [];
  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-xs"><Link className="underline" href="/teacher/learning">Learning plans</Link></p>
      <h1 className="mt-1 text-xl font-semibold">{detail.student.firstName} {detail.student.lastName}</h1>
      <p className="mt-1 text-sm text-muted">{detail.student.englishLevel ?? "Level not assigned yet"} · Learning evidence and estimates, not grades.</p>
      <p className="mt-1 text-xs text-muted">Target: {detail.student.learningProfile?.targetLevelCode ?? "Not set"} · Pace: {detail.student.learningProfile?.learningPace ?? "STANDARD"}</p>
      <LevelProfileForm
        studentId={detail.student.id}
        currentLevel={detail.student.englishLevel}
        targetLevel={detail.student.learningProfile?.targetLevelCode ?? null}
        learningPace={detail.student.learningProfile?.learningPace ?? "STANDARD"}
        dailyGoalMinutes={detail.student.learningProfile?.dailyGoalMinutes ?? 10}
        assignedCourseId={detail.student.learningProfile?.assignedCourseId ?? null}
        levels={levels.map((level) => ({ ...level, displayName: level.displayName ?? level.code }))}
        courses={courses}
      />
      <PreviewCourseForm studentId={detail.student.id} courses={previewCourses} />
      <StudentOverrideForm studentId={detail.student.id} />
      {plan && (
        <>
          <h2 className="mt-6 text-sm font-semibold">Recommended practice</h2>
          <ul className="mt-2 space-y-2">
            {plan.items.map((item) => (
              <li key={item.recommendationId} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-medium">{item.title}</p>
                <p>{item.reason}</p>
              </li>
            ))}
            {plan.items.length === 0 && <li className="text-sm text-muted">No recommendation yet.</li>}
          </ul>
          <h2 className="mt-4 text-sm font-semibold">Skill estimates</h2>
          <ul className="mt-2 text-sm">
            {plan.skills.map((skill) => <li key={skill.code}>{skill.title}: {skill.label}</li>)}
          </ul>
        </>
      )}
      <h2 className="mt-4 text-sm font-semibold">Recent recorded activity</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {detail.events.map((event) => (
          <li key={event.id}>{formatDateTime(event.observedAt)} · {event.eventType}{event.skillCode ? ` · ${event.skillCode}` : ""}</li>
        ))}
        {detail.events.length === 0 && <li className="text-muted">No learning events yet.</li>}
      </ul>
    </div>
  );
}
