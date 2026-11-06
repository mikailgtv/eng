import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assignedGroupIds } from "@/lib/teaching/access";
import { CreateLessonForm } from "@/components/teaching/create-lesson-form";

export const metadata: Metadata = { title: "Courses" };

export default async function TeacherCoursesPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const ids = await assignedGroupIds({ id: user.id, role: user.role, groupId: user.groupId });
  const courses = await prisma.course.findMany({
    where: ids === null ? {} : { assignments: { some: { groupId: { in: ids } } } },
    include: {
      level: { select: { displayName: true } },
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, status: true, durationMin: true } } },
      },
    },
    orderBy: { title: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">Courses</h1>
      <p className="mt-1 text-sm text-muted">Courses assigned to your groups. Students only see published lessons.</p>
      {courses.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No courses are assigned to your groups.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {courses.map((course) => (
            <section key={course.id} className="rounded-2xl border border-border bg-surface p-4">
              <h2 className="font-semibold">{course.title}</h2>
              <p className="text-xs text-muted">{course.level?.displayName ?? "No level"} · {course.status}</p>
              {course.modules.map((mod) => (
                <div key={mod.id} className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{mod.title}</h3>
                    <CreateLessonForm moduleId={mod.id} />
                  </div>
                  <ul className="space-y-1">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Link href={`/teacher/courses/lessons/${lesson.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/5">
                          <span>{lesson.title}</span>
                          <span className="text-xs text-muted">{lesson.status === "PUBLISHED" ? "Published" : lesson.status === "ARCHIVED" ? "Archived" : "Draft"}{lesson.durationMin ? ` · ${lesson.durationMin} min` : ""}</span>
                        </Link>
                      </li>
                    ))}
                    {mod.lessons.length === 0 && <li className="text-sm text-muted">No lessons yet.</li>}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
