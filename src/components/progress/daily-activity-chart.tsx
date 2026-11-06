import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

type Day = { date: string; label: string; lessons: number; reviews: number; activities: number; speaking: number };

export function DailyActivityChart({ history }: { history: Day[] }) {
  const max = Math.max(1, ...history.map((d) => d.lessons + d.reviews + d.activities));
  const hasAny = history.some((d) => d.lessons + d.reviews + d.activities > 0);
  return (
    <Card data-testid="daily-activity-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted" aria-hidden /> Daily activity — last 7 days (UTC)
        </CardTitle>
        <Link href="/student/learning" className="text-xs font-medium text-primary hover:underline">
          Continue learning
        </Link>
      </CardHeader>
      <CardBody>
        {!hasAny && <p className="text-sm text-muted">No activity yet — finish a lesson or review a card and it will appear here by UTC day.</p>}
        <div className="overflow-x-auto">
          <div className="min-w-[360px]">
            {/* Text alternative for screen readers */}
            <p className="sr-only">Daily activity chart: each day shows lessons completed, reviews and practice activities counted by UTC midnight.</p>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {history.map((d) => {
                const total = d.lessons + d.reviews + d.activities;
                const h = total === 0 ? 4 : Math.round((total / max) * 80) + 8;
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-[88px] w-full max-w-[56px] flex-col justify-end">
                      <div
                        className="w-full rounded-t-lg bg-slate-900 transition-all"
                        style={{ height: `${h}px`, opacity: total === 0 ? 0.08 : 1, background: total === 0 ? "#e2e8f0" : "#1e293b" }}
                        aria-hidden
                      >
                        {/* stacked colors via inner divs could be added, but keep simple and accessible */}
                      </div>
                    </div>
                    <span className="text-[11px] tabular-nums text-muted">{d.label}</span>
                    <span className="text-[11px] font-medium tabular-nums text-foreground">{total === 0 ? "—" : `${total}`}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden /> Lessons: sum of completed lessons with status COMPLETED</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden /> Reviews: distinct cards with lastReviewedAt that day</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden /> Activities: practice attempts (speaking shown separately, not scored)</span>
            </div>
            <ul className="mt-3 space-y-1 text-xs tabular-nums text-muted" aria-label="Daily activity details">
              {history.map((d) => (
                <li key={d.date} className="flex flex-wrap gap-2">
                  <span className="font-medium text-foreground">{d.date} · {d.label}:</span>
                  <span>{d.lessons} lessons</span>
                  <span>{d.reviews} reviews</span>
                  <span>{d.activities} activities</span>
                  {d.speaking > 0 && <span className="font-medium text-indigo-700">({d.speaking} speaking practiced — not graded)</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Day boundaries are UTC midnight. Duplicate submissions within 60 seconds for the same activity are counted once. Study minutes from page-open time are not reported; only completed lessons, review actions and submitted practice are counted.
        </p>
      </CardBody>
    </Card>
  );
}
