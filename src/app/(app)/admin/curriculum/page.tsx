import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Layers, ListOrdered } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { contentStatusLabel } from "@/lib/constants";

export const metadata: Metadata = { title: "Curriculum" };

/**
 * ADMIN — read-only curriculum overview (levels → courses).
 * Authoring/management tools arrive in a later phase; this page only shows
 * real, existing structures.
 */
export default async function AdminCurriculumPage() {
  await requirePageUser(["ADMIN"]);

  const levels = await prisma.level.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      description: true,
      status: true,
      order: true,
      courses: {
        select: {
          id: true,
          title: true,
          status: true,
          _count: { select: { modules: true, assignments: true } },
          modules: { select: { lessons: { where: { status: "PUBLISHED" }, select: { id: true } } } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Curriculum"
        description="English levels and their courses. Use Content builder to add a curriculum, units, and lesson drafts without replacing published lessons."
      />

      {levels.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="No levels defined yet." />
        </Card>
      ) : (
        <div className="space-y-6">
          {levels.map((level) => (
            <section key={level.id} aria-label={level.displayName ?? level.name}>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-[15px] font-semibold text-foreground">
                  {level.displayName ?? level.name}
                </h2>
                <StatusBadge status={level.status} />
                <span className="text-xs text-muted">Level {level.order}</span>
              </div>
              {level.description && <p className="mb-3 max-w-2xl text-[13px] text-muted">{level.description}</p>}

              {level.courses.length === 0 ? (
                <p className="rounded-lg bg-muted/5 px-3 py-2 text-[13px] text-muted">No courses in this level yet.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {level.courses.map((course) => {
                    const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
                    return (
                      <li key={course.id}>
                        <Link href={`/admin/curriculum/${course.id}`} className="block h-full">
                          <Card className="h-full transition-shadow hover:shadow-card-hover">
                            <CardBody>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="min-w-0 truncate text-[15px] font-semibold text-foreground">
                                  {course.title}
                                </h3>
                                <span className="shrink-0 text-xs text-muted">{contentStatusLabel(course.status)}</span>
                              </div>
                              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[13px]">
                                <div className="flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5 text-muted" aria-hidden />
                                  <dd className="tabular-nums">{course._count.modules}</dd>
                                  <dt className="sr-only">Modules</dt>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <ListOrdered className="h-3.5 w-3.5 text-muted" aria-hidden />
                                  <dd className="tabular-nums">{lessonCount}</dd>
                                  <dt className="sr-only">Published lessons</dt>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <BookOpen className="h-3.5 w-3.5 text-muted" aria-hidden />
                                  <dd className="tabular-nums">{course._count.assignments}</dd>
                                  <dt className="sr-only">Assigned groups</dt>
                                </div>
                              </dl>
                              <p className="mt-1 text-[11px] text-muted">modules · lessons · groups</p>
                            </CardBody>
                          </Card>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
