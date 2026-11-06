import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { studentEngagement } from "@/lib/gamification/service";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const user = await requirePageUser(["STUDENT"]);
  const data = await studentEngagement(user.id);
  if (data.disabled) return <p className="text-sm text-muted">Motivation features are turned off. Your lessons and grades are unchanged.</p>;
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs"><Link className="underline" href="/student">Dashboard</Link></p>
      <h1 className="mt-1 text-2xl font-semibold">Achievements</h1>
      <p className="mt-1 text-sm text-muted">{data.englishLevelNote} There is no public ranking.</p>
      {data.newBadge && <p className="mt-3 rounded-xl border border-primary/30 px-3 py-2 text-sm" role="status">Badge unlocked: {data.newBadge}</p>}
      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">Learning Level {data.learningLevel}</h2>
        <p className="text-sm text-muted">{data.totalXp} XP. {data.remaining} XP remaining to the next learning level.</p>
        <div className="mt-3"><ProgressBar value={data.percent} label="Learning level progress" /></div>
        <p className="mt-3 text-sm">{data.streakText} Longest recorded streak: {data.longestStreak} days. Saved freezes: {data.freezes}.</p>
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">Today&apos;s goal</h2>
        <p className="mt-1 text-sm">{data.goalProgressMinutes} / {data.goalMinutes} minutes from finished activities. Opening the page does not count.</p>
        <ProgressBar value={data.goalMinutes ? Math.round((Math.min(data.goalMinutes, data.goalProgressMinutes) / data.goalMinutes) * 100) : 0} label="Daily goal" />
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">This week</h2>
        <p className="mt-1 text-sm">{data.weeklyDone} / {data.weeklyTarget} active days. Last week: {data.lastWeekSessions} active days. This compares only with your own previous week.</p>
        <ul className="mt-2 text-sm">
          <li>{data.thisWeek.sessions} finished activities</li>
          <li>{data.thisWeek.minutes} estimated minutes</li>
          <li>{data.thisWeek.vocab} vocabulary reviews</li>
          <li>{data.thisWeek.speaking} speaking sessions</li>
          <li>{data.thisWeek.listening} listening sessions</li>
          <li>{data.thisWeek.lessons} lessons completed</li>
        </ul>
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">Challenges</h2>
        <ul className="mt-2 space-y-2">
          {data.challenges.map((challenge) => (
            <li key={challenge.id} className="rounded-xl border border-border px-3 py-2 text-sm">
              <p className="font-medium">{challenge.title}</p>
              <p>{challenge.progress} / {challenge.target}{challenge.done ? " · completed" : ""} · {challenge.scope === "TEACHER" ? "Teacher challenge" : "Personal"}</p>
            </li>
          ))}
          {data.challenges.length === 0 && <li className="text-sm text-muted">No open challenge.</li>}
        </ul>
        {data.groupChallenge && (
          <p className="mt-3 rounded-xl border border-border px-3 py-2 text-sm">
            {data.groupChallenge.group}: {data.groupChallenge.title}. Together {data.groupChallenge.progress} / {data.groupChallenge.target}. Individual totals are not shown.
          </p>
        )}
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">Badges</h2>
        <ul className="mt-2 space-y-2">
          {data.badges.map((badge) => (
            <li key={badge.id} className="rounded-xl border border-border px-3 py-2 text-sm">
              <p className="font-medium">{badge.earned ? "Earned" : "Locked"}: {badge.name}</p>
              <p>{badge.description}</p>
              <p className="text-xs text-muted">{badge.category}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {data.milestones.map((milestone) => (
            <li key={milestone.name}>{milestone.earned ? "Reached" : "Not yet"}: {milestone.name}. {milestone.description}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
