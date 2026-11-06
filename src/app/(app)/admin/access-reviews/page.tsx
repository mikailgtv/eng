import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { PageHeader } from "@/components/ui/page-header";
import { IdentityAction } from "@/components/identity/actions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Access reviews" };

export default async function AccessReviewsPage() {
  await requirePageUser(["ADMIN"]);
  const reviews = await prisma.accessReview.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { decisions: true } } } });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeader title="Access reviews" description="Open a review, then keep, remove or expire an assignment. Every decision is audited." />
      <IdentityAction title="Open a review" action="/api/access-reviews" confirmLabel="Open review" fields={[{ name: "title", label: "Title", defaultValue: "Quarterly access review" }]} />
      <ul className="space-y-2 text-sm">
        {reviews.length === 0 ? <li className="text-muted">No reviews yet.</li> : reviews.map((review) => <li key={review.id} className="rounded-xl border border-border px-3 py-2">{review.title} · {review.status} · {review._count.decisions} decisions</li>)}
      </ul>
      <IdentityAction title="Record a decision" action="/api/access-reviews" confirmLabel="Save decision" fields={[{ name: "action", label: "Type", defaultValue: "decide" }, { name: "reviewId", label: "Review id" }, { name: "assignmentId", label: "Assignment id" }, { name: "decision", label: "KEEP, REMOVE or EXPIRE", defaultValue: "KEEP" }, { name: "note", label: "Note", required: false }]} />
    </div>
  );
}
