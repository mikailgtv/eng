import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer, scheduleForViewer } from "@/lib/teaching/queries";
import { ScheduleForm } from "@/components/teaching/schedule-form";
import { RecurrenceForm } from "@/components/teaching/recurrence-form";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Schedule" };

const VIEWS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default async function SchedulePage({ searchParams: rawSearchParams }: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const view = VIEWS.some((v) => v.id === searchParams.view) ? searchParams.view! : "week";
  const [data, groups] = await Promise.all([scheduleForViewer(viewer, view), groupsForViewer(viewer)]);

  const events = [
    ...data.sessions.map((s) => ({
      id: s.id,
      kind: "Class",
      title: s.title,
      when: s.scheduledStart,
      meta: `${s.group.name}${s.lesson ? ` · ${s.lesson.title}` : ""} · ${s.status === "IN_PROGRESS" ? "In progress" : s.status === "COMPLETED" ? "Completed" : "Scheduled"}`,
      href: `/teacher/classes/${s.id}`,
    })),
    ...data.assignments.map((a) => ({
      id: a.id,
      kind: "Assignment deadline",
      title: a.title,
      when: a.dueAt,
      meta: a.group.name,
      href: `/teacher/assignments/${a.id}`,
    })),
    ...data.exams.map((e) => ({
      id: e.id,
      kind: e.type === "EXAM" ? "Exam" : "Quiz",
      title: e.title,
      when: e.startAt ?? data.from,
      meta: e.type === "EXAM" ? "Exam" : "Quiz",
      href: `/teacher/exams/${e.id}`,
    })),
  ].sort((a, b) => a.when.getTime() - b.when.getTime());

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-muted">Classes, exams, and assignment deadlines. Type is written, not only colored.</p>
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <ScheduleForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
            <RecurrenceForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
          </div>
        )}
      </div>
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Schedule range">
        {VIEWS.map((item) => (
          <Link
            key={item.id}
            href={`/teacher/classes?view=${item.id}`}
            role="tab"
            aria-selected={view === item.id}
            className={`rounded-full border px-3 py-1.5 text-sm ${view === item.id ? "border-foreground bg-foreground text-surface" : "border-border text-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">Nothing is scheduled in this range.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.kind + event.id}>
              <Link href={event.href} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-muted/5">
                <span>
                  <span className="block text-sm font-medium text-foreground">{event.title}</span>
                  <span className="block text-xs text-muted">{formatDateTime(event.when)} · {event.meta}</span>
                </span>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">{event.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
