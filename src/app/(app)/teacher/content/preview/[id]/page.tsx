import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { previewLesson } from "@/lib/content/lessons";
import { ContentBlocks } from "@/components/learn/content-blocks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Student preview" };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const preview = await previewLesson(user, id).catch(() => null);
  if (!preview) notFound();
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-sm"><Link className="underline" href={`/teacher/content/builder/${id}`}>Back to editor</Link></p>
      <h1 className="mt-2 text-2xl font-semibold">{preview.title}</h1>
      <p className="mt-1 text-sm">Student preview. {preview.note}</p>
      {preview.beginnerMode && <p className="mt-2 rounded-xl border border-border p-3 text-sm">Short steps. Use Replay on any audio. Translation is shown when it was saved.</p>}
      <div className="mt-4">
        <ContentBlocks blocks={preview.blocks as { type: string; data: unknown }[]} />
      </div>
    </div>
  );
}
