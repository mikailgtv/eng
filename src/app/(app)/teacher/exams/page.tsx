import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FileText, PlayCircle, Plus, CalendarClock, Archive, Sparkles, Scale } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { listAssessmentsForStaff } from "@/lib/assessment/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Assessments" };

/**
 * Teacher assessment area: drafts, scheduled, active and completed
 * assessments with type/status/course/date/question count.
 */
export default async function TeacherExamsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const assessments = await listAssessmentsForStaff({ id: user.id, role: user.role, groupId: user.groupId });

  const groups = {
    OPEN: assessments.filter((a) => a.status === "OPEN"),
    SCHEDULED: assessments.filter((a) => a.status === "SCHEDULED"),
    DRAFT: assessments.filter((a) => a.status === "DRAFT"),
    CLOSED: assessments.filter((a) => a.status === "CLOSED" || a.status === "ARCHIVED"),
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Assessments"
        description="Quizzes and exams — build, schedule, open and review."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/teacher/exams/blueprint">
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" aria-hidden /> Blueprint
              </Button>
            </Link>
            <Link href="/teacher/exams/reviews">
              <Button variant="secondary">
                <Scale className="h-4 w-4" aria-hidden /> Review queue
              </Button>
            </Link>
            <Link href="/teacher/exams/new">
              <Button>
                <Plus className="h-4 w-4" aria-hidden /> New assessment
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountCard label="Active now" value={groups.OPEN.length} tone="emerald" />
        <CountCard label="Scheduled" value={groups.SCHEDULED.length} tone="sky" />
        <CountCard label="Drafts" value={groups.DRAFT.length} tone="slate" />
        <CountCard label="Closed" value={groups.CLOSED.length} tone="slate" />
      </div>

      {assessments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assessments yet."
            description="Create your first quiz or exam — you pick the questions from the bank."
            className="py-10"
            action={
              <Link href="/teacher/exams/new">
                <Button>New assessment</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Section title="Active" icon={PlayCircle} items={groups.OPEN} emptyText="Nothing is open right now." />
          <Section title="Scheduled" icon={CalendarClock} items={groups.SCHEDULED} emptyText="Nothing scheduled." />
          <Section title="Drafts" icon={FileText} items={groups.DRAFT} emptyText="No drafts." />
          <Section title="Closed & archived" icon={Archive} items={groups.CLOSED} emptyText="Nothing closed yet." />
        </div>
      )}
    </div>
  );
}

function CountCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "sky" | "slate" }) {
  const styles = {
    emerald: "text-emerald-700",
    sky: "text-sky-700",
    slate: "text-foreground",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${styles}`}>{value}</p>
    </div>
  );
}

type Item = Awaited<ReturnType<typeof listAssessmentsForStaff>>[number];

function Section({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Item[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-muted">{emptyText}</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted" aria-hidden /> {title}
      </h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              href={`/teacher/exams/${a.id}`}
              className="block rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-muted/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{a.title}</p>
                <StatusPill status={a.status} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {a.type === "EXAM" ? "Exam" : "Quiz"} · {a.courseTitle ?? "No course"} · {a.questionsCount} questions ·{" "}
                {a.attemptsCount} attempt{a.attemptsCount === 1 ? "" : "s"}
                {a.startAt ? ` · opens ${formatDateTime(a.startAt)}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "border-emerald-200 bg-emerald-50 text-emerald-800",
    SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
    DRAFT: "border-border bg-muted/10 text-muted",
    CLOSED: "border-amber-200 bg-amber-50 text-amber-800",
    ARCHIVED: "border-border bg-muted/10 text-muted",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] ?? styles.DRAFT}`}>
      {status === "SCHEDULED" ? "Scheduled" : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
