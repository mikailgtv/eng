import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { getDueVocabulary, getUpcomingVocabulary, countDueVocabulary, countUpcomingVocabulary } from "@/lib/practice";
import { ReviewSession } from "@/components/vocab/review-session";

export const metadata: Metadata = { title: "Vocabulary Review" };

export default async function VocabReviewPage() {
  const user = await requirePageUser(["STUDENT", "ADMIN"]);
  const [items, upcomingCount] = await Promise.all([
    getDueVocabulary(user.id),
    countUpcomingVocabulary(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Vocabulary Review</h1>
        <p className="mt-1 text-sm text-muted">
          Review words scheduled for you. Mark “I know it” or “Review again” — your choice decides when it comes back.
        </p>
      </header>
      <ReviewSession initialItems={items} upcomingCount={upcomingCount} />
    </div>
  );
}
