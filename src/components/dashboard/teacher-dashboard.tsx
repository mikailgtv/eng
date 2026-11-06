import Link from "next/link";
import {
  AlarmClock,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Layers,
  PlayCircle,
  UsersRound,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime, fullName } from "@/lib/utils";
import type { SessionUser } from "@/types";
import type { teacherHome } from "@/lib/teaching/queries";
import { MobileShortcuts } from "@/components/layout/mobile-shortcuts";

type Home = Awaited<ReturnType<typeof teacherHome>>;

export function TeacherDashboard({ user, home }: { user: SessionUser; home: Home }) {
  const current = home.active ?? home.todaySessions.find((s) => s.status === "SCHEDULED") ?? null;
  const startable = home.todaySessions.find((s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS");

  return (
    <div className="mx-auto w-full max-w-5xl">
      <MobileShortcuts items={[
        { href: "/teacher/classes", label: "Today's classes" },
        { href: "/teacher/attendance", label: "Attendance" },
        { href: "/teacher/students", label: "Students" },
        { href: "/teacher/content", label: "Content" },
        { href: "/teacher/assignments", label: "Assignments" },
        { href: "/teacher/exams", label: "Exams" },
        { href: "/teacher/messages", label: "Messages" },
        { href: "/teacher/reports", label: "Reports" },
      ]} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Welcome, {fullName(user)}</h1>
          <p className="mt-1 text-sm text-muted">Today’s classes, your groups, and what needs a decision.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {startable ? (
            <Link href={`/teacher/classes/${startable.id}`}>
              <Button>
                <PlayCircle className="h-4 w-4" aria-hidden />
                {startable.status === "IN_PROGRESS" ? "Continue class" : "Start today’s class"}
              </Button>
            </Link>
          ) : null}
          <Link href="/teacher/classes">
            <Button variant="secondary">View schedule</Button>
          </Link>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Assigned groups" value={home.groups.length} icon={Layers} href="/teacher/groups" />
        <StatCard label="Students" value={home.students} icon={UsersRound} href="/teacher/students" />
        <StatCard label="Active students" value={home.activeStudents} icon={UsersRound} href="/teacher/students" />
        <StatCard label="Need a look" value={home.needingAttention} icon={AlarmClock} href="/teacher/students?attention=1" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
          </CardHeader>
          <CardBody>
            {home.todaySessions.length === 0 && !home.active ? (
              <p className="text-sm text-muted">No class is scheduled for today (UTC). The next sessions are under Upcoming.</p>
            ) : (
              <ul className="space-y-2">
                {home.active && (
                  <ClassRow
                    href={`/teacher/classes/${home.active.id}`}
                    title={home.active.title}
                    meta={`${home.active.group.name} · In progress${home.active.lesson ? ` · ${home.active.lesson.title}` : ""}`}
                    label="Current"
                  />
                )}
                {home.todaySessions
                  .filter((s) => s.id !== home.active?.id)
                  .map((s) => (
                    <ClassRow
                      key={s.id}
                      href={`/teacher/classes/${s.id}`}
                      title={s.title}
                      meta={`${s.group.name} · ${formatDateTime(s.scheduledStart)} · ${s.status === "SCHEDULED" ? "Scheduled" : s.status === "COMPLETED" ? "Completed" : "In progress"}`}
                      label={s.status === "COMPLETED" ? "Done" : "Today"}
                    />
                  ))}
              </ul>
            )}
            {current && (
              <p className="mt-3 text-xs text-muted">
                Attendance and the lesson are on the class page — not a separate fake shortcut.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Action href="/teacher/students" icon={UsersRound} label="View students" />
            <Action href="/teacher/classes" icon={CalendarDays} label="View schedule" />
            <Action href="/teacher/assignments/new" icon={ClipboardList} label="Create assignment" />
            <Action href="/teacher/courses" icon={BookOpen} label="Open courses" />
            {startable && <Action href={`/teacher/classes/${startable.id}`} icon={PlayCircle} label="Take attendance" />}
          </CardBody>
        </Card>
      </div>

      <section className="mb-6" aria-labelledby="my-groups">
        <h2 id="my-groups" className="mb-3 text-[15px] font-semibold text-foreground">My groups</h2>
        {home.groups.length === 0 ? (
          <Card>
            <EmptyState icon={Layers} title="No groups assigned yet." description="An administrator assigns the groups you teach." />
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {home.groups.map((g) => (
              <li key={g.id}>
                <Link href={`/teacher/groups/${g.id}`} className="block rounded-xl border border-border bg-surface px-4 py-3 hover:bg-muted/5">
                  <p className="font-semibold text-foreground">{g.name}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    <span className="font-semibold tabular-nums text-foreground">{g._count.members}</span> students
                    {g.assignments[0] ? ` · ${g.assignments[0].course.title}` : " · No course assigned"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teaching tasks</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <TaskList title="Assignments" empty="No open assignments.">
              {home.assignments.map((a) => (
                <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="block text-sm hover:underline">
                  <span className="font-medium text-foreground">{a.title}</span>
                  <span className="text-muted"> · {a.group.name} · {a.status === "DRAFT" ? "Draft" : `due ${formatDateTime(a.dueAt)}`}</span>
                </Link>
              ))}
            </TaskList>
            <TaskList title="Upcoming exams" empty="No upcoming exams for your groups.">
              {home.exams.map((e) => (
                <Link key={e.id} href={`/teacher/exams/${e.id}`} className="block text-sm hover:underline">
                  <span className="font-medium text-foreground">{e.title}</span>
                  <span className="text-muted"> · {e.type === "EXAM" ? "Exam" : "Quiz"} · {e.status === "OPEN" ? "Open" : e.startAt ? formatDateTime(e.startAt) : "Scheduled"}</span>
                </Link>
              ))}
            </TaskList>
            <TaskList title="Lesson plans still open" empty="No unfinished plans.">
              {home.plans.map((p) => (
                <Link key={p.id} href="/teacher/plans" className="block text-sm hover:underline">
                  <span className="font-medium text-foreground">{p.lesson?.title ?? "Unassigned lesson"}</span>
                  <span className="text-muted"> · {p.group.name} · {formatDateTime(p.plannedDate)}</span>
                </Link>
              ))}
            </TaskList>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students to look at</CardTitle>
          </CardHeader>
          <CardBody>
            {home.attention.length === 0 ? (
              <p className="text-sm text-muted">Nothing in the current checks: sign-ins, overdue work, failed assessments, low practice accuracy, or absences.</p>
            ) : (
              <ul className="space-y-2">
                {home.attention.map((item) => (
                  <li key={item.studentId + item.reason}>
                    <Link href={`/teacher/students/${item.studentId}`} className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/5">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted">{item.groupName} · {item.reason}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ActivityList title="Attendance" empty="No attendance marks yet.">
            {home.recentAttendance.map((r) => (
              <li key={r.id} className="text-[13px] text-muted">
                {r.student.firstName} {r.student.lastName} · {labelStatus(r.status)} · {r.session.group.name}
              </li>
            ))}
          </ActivityList>
          <ActivityList title="Exam results" empty="No submitted exams in your groups.">
            {home.recentResults.map((r) => (
              <li key={r.id} className="text-[13px] text-muted">
                {r.student.firstName} {r.student.lastName} · {r.assessment.title} · {r.percentage ?? "—"}%
              </li>
            ))}
          </ActivityList>
          <ActivityList title="Assignment submissions" empty="No submissions yet.">
            {home.recentSubmissions.map((r) => (
              <li key={r.id} className="text-[13px] text-muted">
                {r.student.firstName} {r.student.lastName} · {r.assignment.title}
              </li>
            ))}
          </ActivityList>
        </CardBody>
      </Card>

      {home.upcoming.length > 0 && (
        <section className="mt-6" aria-labelledby="upcoming-classes">
          <h2 id="upcoming-classes" className="mb-2 text-[15px] font-semibold">Upcoming classes</h2>
          <ul className="space-y-2">
            {home.upcoming.map((s) => (
              <ClassRow key={s.id} href={`/teacher/classes/${s.id}`} title={s.title} meta={`${s.group.name} · ${formatDateTime(s.scheduledStart)}`} label="Upcoming" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ClassRow({ href, title, meta, label }: { href: string; title: string; meta: string; label: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-muted/5">
        <span>
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block text-xs text-muted">{meta}</span>
        </span>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted">{label}</span>
      </Link>
    </li>
  );
}

function Action({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href}>
      <Button variant="secondary" className="w-full justify-start">
        <Icon className="h-4 w-4 text-muted" aria-hidden /> {label}
      </Button>
    </Link>
  );
}

function TaskList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {items.length === 0 ? <p className="text-[13px] text-muted">{empty}</p> : <div className="space-y-1">{children}</div>}
    </div>
  );
}

function ActivityList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [];
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {items.length === 0 ? <p className="text-[13px] text-muted">{empty}</p> : <ul className="space-y-1">{children}</ul>}
    </div>
  );
}

function labelStatus(status: string) {
  return status === "PRESENT" ? "Present" : status === "ABSENT" ? "Absent" : status === "LATE" ? "Late" : status === "EXCUSED" ? "Excused" : status;
}
