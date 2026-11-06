import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card, CardBody } from "@/components/ui/card";

export function EngagementCard({
  learningLevel,
  percent,
  remaining,
  totalXp,
  goalMinutes,
  goalProgressMinutes,
  streakText,
  newBadge,
}: {
  learningLevel: number;
  percent: number;
  remaining: number;
  totalXp: number;
  goalMinutes: number;
  goalProgressMinutes: number;
  streakText: string;
  newBadge: string | null;
}) {
  const goalPercent = goalMinutes > 0 ? Math.round((Math.min(goalMinutes, goalProgressMinutes) / goalMinutes) * 100) : 0;
  return (
    <Card className="mb-6">
      <CardBody>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Motivation</p>
        <h2 className="mt-1 text-lg font-semibold">Learning Level {learningLevel}</h2>
        <p className="mt-1 text-sm text-muted">This is not your English level. English level stays on your course and assessments.</p>
        <div className="mt-3">
          <ProgressBar value={percent} label={`${totalXp} XP · ${remaining} XP to the next learning level`} />
        </div>
        <div className="mt-4">
          <ProgressBar value={goalPercent} label={`Today's goal: ${Math.min(goalProgressMinutes, goalMinutes)} of ${goalMinutes} minutes`} />
        </div>
        <p className="mt-3 text-sm">{streakText}</p>
        {goalProgressMinutes === 0 && <p className="mt-2 text-sm">Your learning plan is waiting.</p>}
        {newBadge && (
          <p className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
            Badge unlocked: {newBadge}
          </p>
        )}
        <Link href="/student/achievements" className="mt-3 inline-flex h-11 items-center text-sm font-medium text-primary underline">Achievements</Link>
      </CardBody>
    </Card>
  );
}
