import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { getLearningSummary } from "@/lib/learning";
import { getPracticeStats, getVocabularyReviewCounts } from "@/lib/practice";
import { getDailyGoal, getDailyProgress, getDailyActivityHistory, getSpeakingStats } from "@/lib/daily-goals";
import { listMyAttemptHistory } from "@/lib/assessment/queries";
import { StudentProgress } from "@/components/progress/student-progress";

export const metadata: Metadata = { title: "My Progress" };

export default async function StudentProgressPage() {
  const user = await requirePageUser(["STUDENT", "ADMIN"]);
  const [learning, practice, vocab, goal, progress, history, speakingStats, assessments] = await Promise.all([
    getLearningSummary(user.id, user.groupId),
    getPracticeStats(user.id),
    getVocabularyReviewCounts(user.id),
    getDailyGoal(user.id).catch(() => ({ type: "LESSONS" as const, value: 1, enabled: true })),
    getDailyProgress(user.id, new Date()).catch(() => ({ type: "LESSONS" as const, target: 1, completed: 0, remaining: 1, percent: 0, enabled: true, dayKey: new Date().toISOString().slice(0, 10) })),
    getDailyActivityHistory(user.id, 7).catch(() => []),
    getSpeakingStats(user.id, new Date()).catch(() => ({ speakingCompletedToday: 0, assessedCompletedToday: 0, speakingTotal: 0 })),
    listMyAttemptHistory({ id: user.id, role: user.role, groupId: user.groupId }).catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">My Progress</h1>
        <p className="mt-1 text-sm text-muted">How far you have come — updated as you complete lessons. Every metric is calculated from real completion records with a clear definition.</p>
        <p className="mt-1 text-xs text-muted">Day boundaries are UTC midnight. Speaking practice is shown as completion, not a grade. Minutes from page-open time are not counted.</p>
      </header>
      <StudentProgress learning={learning} practice={practice} vocab={vocab} goal={goal} progress={progress} history={history} speakingStats={speakingStats} assessments={assessments} />
    </div>
  );
}
