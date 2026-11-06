import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { contentStatusLabel } from "@/lib/constants";

export const metadata: Metadata = { title: "Course details" };

/**
 * ADMIN — read-only course view: modules and lessons with publishing status.
 * Editing arrives with the teacher/admin content builder in a later phase.
 */
export default async function AdminCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await requirePageUser(["ADMIN"]);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      level: { select: { displayName: true } },
      assignments: { select: { group: { select: { name: true } } } },
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          status: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, durationMin: true, status: true, order: true },
          },
        },
      },
    },
  });

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Course not found."
            action={
              <Link href="/admin/curriculum">
                <Button variant="secondary" size="sm">Back to curriculum</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/curriculum"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to curriculum
      </Link>

      <PageHeader
        title={course.title}
        description={course.description ?? undefined}
        actions={
          <span className="rounded-full bg-muted/10 px-3 py-1 text-xs font-medium text-muted">
            {contentStatusLabel(course.status)}
          </span>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
        <span>Level: <span className="font-medium text-foreground">{course.level.displayName}</span></span>
        <span>
          Assigned groups:{" "}
          <span className="font-medium text-foreground">
            {course.assignments.length === 0
              ? "None"
              : course.assignments.map((a) => a.group.name).join(", ")}
          </span>
        </span>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle className="text-[15px]">
                Module {module.order}: {module.title}
              </CardTitle>
              <span className="text-xs text-muted">
                {contentStatusLabel(module.status)} · {module.lessons.length} lessons
              </span>
            </CardHeader>
            {module.lessons.length === 0 ? (
              <CardBody>
                <p className="text-[13px] text-muted">No lessons in this module yet.</p>
              </CardBody>
            ) : (
              <CardBody className="p-0">
                <ul className="space-y-2 p-3 md:hidden">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">{lesson.order}. {lesson.title}</p>
                      <p className="text-muted">{lesson.durationMin ? `${lesson.durationMin} min` : "No duration"} · {contentStatusLabel(lesson.status)}</p>
                    </li>
                  ))}
                </ul>
                <div className="table-scroll hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/5 text-xs uppercase tracking-wide text-muted">
                      <th scope="col" className="px-5 py-2.5 font-medium">#</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Lesson</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Duration</th>
                      <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {module.lessons.map((lesson) => (
                      <tr key={lesson.id} className="border-b border-border/70 last:border-0">
                        <td className="px-5 py-2.5 tabular-nums text-muted">{lesson.order}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{lesson.title}</td>
                        <td className="px-4 py-2.5 tabular-nums text-muted">
                          {lesson.durationMin ? `${lesson.durationMin} min` : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-muted">{contentStatusLabel(lesson.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </CardBody>
            )}
          </Card>
        ))}
        {course.modules.length === 0 && (
          <Card>
            <EmptyState icon={BookOpen} title="No modules in this course yet." />
          </Card>
        )}
      </div>
    </div>
  );
}
