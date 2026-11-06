import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assertLessonStaffAccess } from "@/lib/teaching/access";
import { parseBlock } from "@/lib/blocks";
import { LessonEditor } from "@/components/teaching/lesson-editor";

export const metadata: Metadata = { title: "Lesson" };

export default async function TeacherLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const lesson = await assertLessonStaffAccess({ id: user.id, role: user.role, groupId: user.groupId }, id).catch(() => null);
  if (!lesson) notFound();
  const full = await prisma.lesson.findUnique({
    where: { id: lesson.id },
    include: {
      blocks: { orderBy: { order: "asc" } },
      vocabulary: true,
      grammar: true,
      activities: { select: { id: true, title: true, type: true } },
      classAssignments: { select: { id: true, title: true, status: true } },
      module: { select: { title: true, course: { select: { title: true } } } },
    },
  });
  if (!full) notFound();

  const blocks = full.blocks.map((b) => {
    const parsed = parseBlock(b.type, b.data);
    return { id: b.id, type: b.type, data: parsed.kind === "ok" ? (parsed.data as Record<string, unknown>) : { text: "Invalid block" } };
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-xs text-muted"><Link href="/teacher/courses" className="underline">Courses</Link> · {full.module.course.title} · {full.module.title}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{full.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {full.status === "PUBLISHED" ? "Published" : full.status === "ARCHIVED" ? "Archived" : "Draft"}
        {full.durationMin ? ` · ${full.durationMin} min` : ""}
        {` · ${full.activities.length} activities · ${full.vocabulary.length} vocabulary · ${full.grammar.length} grammar · ${full.classAssignments.length} assignments`}
      </p>
      <div className="mt-5">
        <LessonEditor lessonId={full.id} status={full.status} blocks={blocks} />
      </div>
      <section className="mt-8" aria-labelledby="preview-heading">
        <h2 id="preview-heading" className="mb-2 text-sm font-semibold">Preview</h2>
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
          {blocks.length === 0 && <p className="text-muted">Add a block to preview the lesson.</p>}
          {blocks.map((b) => (
            <p key={b.id}><span className="text-xs uppercase text-muted">{b.type}. </span>{previewText(b.data)}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function previewText(data: Record<string, unknown>) {
  if (typeof data.text === "string" && data.text) return data.text;
  if (typeof data.title === "string" && data.title) return data.title;
  if (typeof data.prompt === "string") return data.prompt;
  if (Array.isArray(data.items)) return `${data.items.length} item${data.items.length === 1 ? "" : "s"}`;
  if (typeof data.url === "string") return data.url || "No media URL";
  return "—";
}
