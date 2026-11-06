import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { readDraft } from "@/lib/content/lessons";
import { LessonBuilder, type DraftBlock } from "@/components/content/builder";
import { ReviewActions } from "@/components/content/review-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lesson builder" };

export default async function LessonBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const draft = await readDraft(user, id).catch(() => null);
  if (!draft) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="text-sm"><Link className="underline" href="/teacher/content">Content builder</Link></p>
      <h1 className="mt-1 text-xl font-semibold">{draft.lesson.title}</h1>
      <p className="mt-1 text-sm text-muted">{draft.lesson.status}. Autosave keeps a server draft and a browser copy.</p>
      <div className="mt-3"><ReviewActions lessonId={id} admin={user.role === "ADMIN"} /></div>
      <div className="mt-4">
        <LessonBuilder lessonId={id} initial={draft.blocks as DraftBlock[]} savedAt={draft.savedAt} beginner={draft.lesson.beginnerMode} />
      </div>
    </div>
  );
}
