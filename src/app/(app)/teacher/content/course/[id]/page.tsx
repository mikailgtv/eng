import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canEditCourse } from "@/lib/content/access";
import { StructureForm } from "@/components/content/structure-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Course builder" };

export default async function CourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  if (!(await canEditCourse(user, id))) notFound();
  const course = await prisma.course.findUnique({
    where: { id: id },
    include: { level: true, modules: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" } }, lessons: { orderBy: { order: "asc" } } } } },
  });
  if (!course) notFound();
  const groups = await prisma.learningGroup.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="text-sm"><Link className="underline" href="/teacher/content">Content builder</Link></p>
      <h1 className="mt-1 text-xl font-semibold">{course.title}</h1>
      <p className="mt-1 text-sm text-muted">{course.level.displayName ?? course.level.name} · {course.status} · version {course.version}. Academic level and difficulty stay separate.</p>
      <StructureForm courseId={course.id} modules={course.modules.map((mod) => ({ id: mod.id, title: mod.title }))} lessons={course.modules.flatMap((mod) => mod.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })))} groups={groups} />
      <div className="mt-4 space-y-4">
        {course.modules.map((mod) => (
          <section key={mod.id} className="rounded-2xl border border-border p-3">
            <h2 className="font-semibold">{mod.title}</h2>
            {mod.units.length > 0 && <p className="mt-1 text-xs text-muted">Units: {mod.units.map((unit) => unit.title).join(", ")}</p>}
            <ul className="mt-2 space-y-1 text-sm">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-2 py-2">
                  <span>{lesson.title}</span>
                  <span className="text-xs text-muted">{lesson.workflowStatus ?? lesson.status}</span>
                  <Link className="underline" href={`/teacher/content/builder/${lesson.id}`}>Edit</Link>
                  <Link className="underline" href={`/teacher/content/preview/${lesson.id}`}>Preview</Link>
                </li>
              ))}
              {mod.lessons.length === 0 && <li className="text-muted">No lessons yet.</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
