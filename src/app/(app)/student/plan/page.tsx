import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { studentPlan } from "@/lib/adaptive/service";
import { PlanActions } from "@/components/adaptive/plan-actions";

export const metadata: Metadata = { title: "Today's plan" };

export default async function StudentPlanPage() {
  const user = await requirePageUser(["STUDENT"]);
  const plan = await studentPlan(user.id);
  if (!plan || plan.disabled) {
    return <p className="text-sm text-muted">Adaptive learning is turned off. Your lessons, practice, and exams are unchanged.</p>;
  }
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your learning plan</p>
      <h1 className="mt-1 text-2xl font-semibold">Today&apos;s goal: {plan.minutes} minutes</h1>
      <p className="mt-1 text-sm text-muted">This is a learning progress estimate from your own records. It is not a grade and it is not compared with other students.</p>
      {plan.note && <p className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm">{plan.note}</p>}
      <p className="mt-3 text-sm">{plan.practiceDays} practice day{plan.practiceDays === 1 ? "" : "s"} in the last 7 days. A missed day is not a penalty. Let&apos;s continue from here.</p>
      <ol className="mt-4 space-y-3">
        {plan.items.map((item, index) => (
          <li key={item.recommendationId} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{index + 1} · {item.durationMin} min · {sourceLabel(item.source)}</p>
            <p className="mt-1 text-lg font-medium">{item.title}</p>
            <p className="mt-1 text-sm">{item.reason}</p>
            <Link href={item.href} className="mt-2 inline-flex h-11 items-center text-sm font-medium underline">Open</Link>
          </li>
        ))}
        {plan.items.length === 0 && <li className="text-sm text-muted">No recommendation is stored yet. Open a lesson to begin.</li>}
      </ol>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Learning progress estimate</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {plan.skills.map((skill) => (
            <li key={skill.code} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <span>{skill.title}</span>
              <span>{skill.label}{skill.observedCorrect + skill.observedIncorrect > 0 ? ` · ${skill.observedCorrect} correct, ${skill.observedIncorrect} incorrect` : ""}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">This week</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {plan.weekly.map((day) => (
            <li key={day.day} className="rounded-lg border border-border px-3 py-2">
              <span className="font-medium">{day.day}:</span> {day.focus}
              <span className="mt-1 block text-xs text-muted">{day.note}</span>
            </li>
          ))}
        </ul>
      </section>
      {plan.goals.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Goals</h2>
          <ul className="mt-2 text-sm">
            {plan.goals.map((goal) => <li key={goal.id}>{goal.text} · {goal.source === "STUDENT" ? "Your goal" : "Teacher or group goal"}</li>)}
          </ul>
        </section>
      )}
      <p className="mt-4 text-sm text-muted">This page does not save practice on your device. If the connection fails, try again when you are online. Nothing is marked complete until the server records it.</p>
      <PlanActions items={plan.items} />
    </div>
  );
}

function sourceLabel(source: string) {
  if (source === "TEACHER") return "Teacher";
  if (source === "REVIEW") return "Review";
  if (source === "COURSE") return "Course";
  if (source === "STUDENT_GOAL") return "Goal";
  if (source === "AI") return "Personalized AI Practice";
  return "From your records";
}
