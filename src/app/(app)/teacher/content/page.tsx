import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { listCurricula } from "@/lib/content/service";
import { contentSettings } from "@/lib/content/settings";
import { prisma } from "@/lib/prisma";
import { ContentCreateForm } from "@/components/content/create-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Content builder" };

export default async function TeacherContentPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const [curricula, settings, levels, reviews] = await Promise.all([
    listCurricula(),
    contentSettings(),
    prisma.level.findMany({ orderBy: { order: "asc" }, select: { id: true, displayName: true, name: true } }),
    prisma.contentReview.findMany({ where: { status: "IN_REVIEW" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-xl font-semibold">Content builder</h1>
      <p className="mt-1 text-sm text-muted">Build on the existing courses. Students only see published lessons. Difficulty is a content tag, not an English level.</p>
      <p className="mt-2 text-sm">Builder {settings.builderEnabled ? "on" : "off"}. Review required: {settings.requireReview ? "yes" : "no"}.</p>
      <p className="mt-2 text-sm"><Link className="underline" href="/teacher/content/library">Content library</Link></p>
      <section className="mt-4"><ContentCreateForm levels={levels.map((level) => ({ id: level.id, name: level.displayName ?? level.name }))} curricula={curricula.map((item) => ({ id: item.id, title: item.title }))} admin={user.role === "ADMIN"} /></section>
      <ul className="mt-4 space-y-2 text-sm">
        {curricula.map((item) => (
          <li key={item.id} className="rounded-xl border border-border px-3 py-2">
            <span className="font-medium">{item.title}</span>
            <span className="mt-1 block text-muted">{item.status} · version {item.version} · {item._count.courses} courses</span>
          </li>
        ))}
      </ul>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">Waiting for review</h2>
        {reviews.length === 0 && <p className="mt-1 text-sm text-muted">No lesson is waiting.</p>}
        <ul className="mt-2 space-y-1 text-sm">
          {reviews.map((review) => <li key={review.id}>{review.resourceType} {review.resourceId} · {review.status}</li>)}
        </ul>
      </section>
    </div>
  );
}
