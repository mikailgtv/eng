import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { engagementUsage } from "@/lib/gamification/service";
import { AdminGamificationSettings } from "@/components/gamification/admin-gamification-settings";

export const metadata: Metadata = { title: "Gamification" };

export default async function AdminGamificationPage() {
  await requirePageUser(["ADMIN"]);
  const usage = await engagementUsage();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Gamification</h1>
      <p className="mt-1 text-sm text-muted">Aggregate counts. No leaderboard, no best or worst student, and no shift ranking. Learning Level is not an English level.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Active learners, 7 days" value={usage.activeLearners7d} />
        <Stat label="Badges earned, 7 days" value={usage.badgesEarned7d} />
        <Stat label="Challenges completed, 7 days" value={usage.challengesCompleted7d} />
        <Stat label="Flagged for review" value={usage.flaggedForReview} />
        <Stat label="Streaks under 7 days" value={usage.streakBuckets.short} />
        <Stat label="Streaks of 7 or more" value={usage.streakBuckets.week} />
      </dl>
      <AdminGamificationSettings />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
