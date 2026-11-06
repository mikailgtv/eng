import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  GraduationCap,
  History,
  Repeat,
  Target,
  XCircle,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyInline, EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LessonStatusIcon } from "@/components/learn/lesson-status-icon";
import { fullName, formatDateTime } from "@/lib/utils";
import type { LearningSummary } from "@/types/learning";
import type { PracticeStats } from "@/lib/practice";
import type { AvailableAssessment, HistoryRow } from "@/lib/assessment/queries";
import type { SessionUser } from "@/types";
import { TodayPlanCard } from "@/components/adaptive/today-plan-card";
import { EngagementCard } from "@/components/gamification/engagement-card";
import { MobileShortcuts } from "@/components/layout/mobile-shortcuts";

type RecentAttempt = {
  id: string;
  isCorrect: boolean;
  submittedAt: Date;
  prompt: string;
  lessonId: string;
  lessonTitle: string;
};

interface StudentDashboardProps {
  user: SessionUser;
  learningProfile?: { targetLevelCode: string | null; levelStatus: string } | null;
  mascotReaction?: { reactionCode: string; caption: string } | null;
  learning: LearningSummary;
  practice: PracticeStats;
  dueWords: number;
  recentAttempts: {
    id: string;
    isCorrect: boolean;
    submittedAt: Date;
    prompt: string;
    lessonId: string;
    lessonTitle: string;
  }[];
  upcomingAssessments: AvailableAssessment[];
  openAssessments: AvailableAssessment[];
  recentResults: HistoryRow[];
  quizProgress: AvailableAssessment[];
  plan?: { minutes: number; items: { title: string; reason: string; href: string; durationMin: number }[]; note: string | null } | null;
  engagement?: {
    learningLevel: number;
    percent: number;
    remaining: number;
    totalXp: number;
    goalMinutes: number;
    goalProgressMinutes: number;
    streakText: string;
    newBadge: string | null;
  } | null;
}

/**
 * STUDENT dashboard — Phase 3.
 * Every number comes from real records: course progress from lesson
 * completions, practice accuracy from activity attempts, the streak from
 * activity timestamps, review queue from vocabulary_review scheduling.
 */
export function StudentDashboard({
  user,
  learningProfile,
  mascotReaction,
  learning,
  practice,
  dueWords,
  recentAttempts,
  upcomingAssessments,
  openAssessments,
  recentResults,
  quizProgress,
  plan,
  engagement,
}: StudentDashboardProps) {
  const { activeCourse, continueLearning, totals, streakDays, recent } = learning;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {!user.englishLevel && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Level not assigned yet.</strong> Your teacher will confirm your level before your learning path is opened.</div>}
      {user.englishLevel && <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-800">Current level · {user.englishLevel}</span>{learningProfile?.targetLevelCode && <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-800">Goal · {learningProfile.targetLevelCode}</span>}</div>}
      <section className="relative isolate min-h-[275px] overflow-hidden rounded-[28px] border border-indigo-100 bg-[#eaf1ff] shadow-[0_14px_40px_rgba(53,74,148,0.08)] sm:min-h-[300px]">
        <Image
          src="/images/englishbridge-firefighter-mascot.png"
          alt="The EnglishBridge firefighter leopard mascot cheering the learner on"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1152px"
          className="-z-20 object-cover object-[72%_center] sm:object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#eef3ff] via-[#eef3ff]/95 to-[#eef3ff]/10 sm:via-[#eef3ff]/80 sm:to-transparent" />
        <div className="relative z-10 flex min-h-[275px] max-w-[650px] flex-col justify-center px-5 py-6 sm:min-h-[300px] sm:px-9 sm:py-8">
          <p className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Your learning journey
          </p>
          <p className="text-lg font-medium leading-tight text-[#1d2b55] sm:text-[23px]">Small steps.</p>
          <h1 className="max-w-[500px] text-[32px] font-extrabold leading-[1.05] tracking-tight text-[#263f9e] sm:text-[46px]">
            Big progress, {user.firstName}!
          </h1>
          <p className="mt-3 max-w-[360px] text-sm font-medium text-[#384a78] sm:text-base">Learn. Practice. Grow. Every lesson brings you closer to your goals.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link href={continueLearning ? `/student/learn/${continueLearning.current.id}` : "/student/learning"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#263f9e] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/15 transition hover:-translate-y-0.5 hover:bg-[#1c307e]">
              <BookOpen className="h-4 w-4" aria-hidden /> {continueLearning ? "Continue learning" : "Explore lessons"}
            </Link>
            <span className="hidden rounded-xl border border-white/80 bg-white/65 px-3.5 py-2.5 text-xs font-semibold text-[#43527b] sm:inline-flex">
              {activeCourse ? activeCourse.level.displayName : "Ready when you are"}
            </span>
          </div>
        </div>
        <div className="absolute bottom-3 right-3 z-10 hidden rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-md backdrop-blur-sm sm:block">
          <p className="text-xs font-semibold text-[#18264a]">{mascotReaction ? `Leopard says: ${mascotReaction.reactionCode.toLowerCase().replaceAll("_", " ")}` : "Your firefighter leopard is cheering you on"}</p>
          <p className="mt-0.5 text-[11px] text-slate-600">{mascotReaction?.caption ?? "Take one small step on your learning path today."}</p>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:gap-4">
        <Link href="/student/learning" className="group flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-[0_4px_16px_rgba(20,35,80,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[98px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4 sm:text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700 sm:h-12 sm:w-12"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <span className="min-w-0"><span className="block text-[11px] font-bold text-slate-800 sm:text-sm">Learn</span><span className="hidden text-xs text-slate-500 sm:block">Build new skills</span></span>
        </Link>
        <Link href="/student/review" className="group flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-[0_4px_16px_rgba(20,35,80,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[98px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4 sm:text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 sm:h-12 sm:w-12"><Repeat className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <span className="min-w-0"><span className="block text-[11px] font-bold text-slate-800 sm:text-sm">Practice</span><span className="hidden text-xs text-slate-500 sm:block">Build confidence</span></span>
        </Link>
        <Link href="/student/achievements" className="group flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-[0_4px_16px_rgba(20,35,80,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[98px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4 sm:text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fuchsia-100 text-fuchsia-700 sm:h-12 sm:w-12"><GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <span className="min-w-0"><span className="block text-[11px] font-bold text-slate-800 sm:text-sm">Achieve</span><span className="hidden text-xs text-slate-500 sm:block">Reach your goals</span></span>
        </Link>
      </div>

      <MobileShortcuts items={[ 
        { href: "/student/learning", label: "Continue lesson" },
        { href: "/student/review", label: "Vocabulary review" },
        { href: "/student/tutor", label: "AI Tutor" },
        { href: "/student/speaking", label: "Speaking" },
        { href: "/student/listening", label: "Listening" },
        { href: "/student/assignments", label: "Assignments" },
        { href: "/student/exams", label: "Exams" },
        { href: "/student/certificates", label: "Certificates" },
      ]} />
      <div className="flex flex-wrap items-center gap-2">
        {activeCourse && <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{activeCourse.level.displayName} · {activeCourse.title}</span>}
        {streakDays > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><Flame className="h-3.5 w-3.5" aria-hidden /> {streakDays}-day streak</span>}
        <Link href="/student/tutor" className="ml-auto text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline">Ask your English Tutor →</Link>
      </div>

      {engagement && (
        <EngagementCard
          learningLevel={engagement.learningLevel}
          percent={engagement.percent}
          remaining={engagement.remaining}
          totalXp={engagement.totalXp}
          goalMinutes={engagement.goalMinutes}
          goalProgressMinutes={engagement.goalProgressMinutes}
          streakText={engagement.streakText}
          newBadge={engagement.newBadge}
        />
      )}
      {plan && <TodayPlanCard minutes={plan.minutes} items={plan.items} note={plan.note} />}

      {/* Overall progress */}
      <Card className="mb-6 overflow-hidden">
        <CardBody>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div
              role="progressbar"
              aria-label="Overall lesson completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={totals.totalLessons > 0 ? totals.percent : 0}
              className="grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full p-[7px] shadow-inner sm:h-[88px] sm:w-[88px]"
              style={{ background: `conic-gradient(#14b8a6 ${totals.totalLessons > 0 ? totals.percent : 0}%, #e8edf5 0)` }}
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-white text-[17px] font-extrabold tabular-nums text-[#18264a]">
                {totals.totalLessons > 0 ? `${totals.percent}%` : "—"}
              </span>
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold text-[#18264a]">Your progress</h2>
                <p className="text-xs font-medium text-slate-500">
                  <span className="font-bold tabular-nums text-slate-800">{totals.completedLessons}</span> of{" "}
                  <span className="font-bold tabular-nums text-slate-800">{totals.totalLessons}</span> lessons
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {totals.totalLessons > 0 ? "You’re doing great. Keep going to reach your goals!" : "Your progress will appear as soon as a course is assigned."}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all" style={{ width: `${totals.totalLessons > 0 ? totals.percent : 0}%` }} />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Continue learning */}
      {continueLearning ? (
        <Card className="mb-6 border-primary/25">
          <CardHeader>
            <CardTitle>Continue learning</CardTitle>
            <span className="text-xs text-muted">{continueLearning.current.courseTitle}</span>
          </CardHeader>
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {continueLearning.current.moduleTitle}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {continueLearning.current.title}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href={`/student/learn/${continueLearning.current.id}`}>
                <Button size="lg">
                  {continueLearning.current.progress === "IN_PROGRESS" ? "Continue lesson" : "Start lesson"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              {continueLearning.next && (
                <p className="text-[13px] text-muted">
                  Next: <span className="font-medium text-foreground">{continueLearning.next.title}</span>
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      ) : activeCourse ? (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/60">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
              <p className="text-sm font-medium text-emerald-900">
                Congratulations — you finished every lesson in {activeCourse.title}!
              </p>
            </div>
            <Link href="/student/learning">
              <Button variant="secondary" size="sm">Review lessons</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={BookOpen}
            title="No course assigned yet."
            description="As soon as your group is assigned a course, your lessons will appear here."
            className="py-8"
          />
        </Card>
      )}

      {/* Practice Today + Vocabulary Review */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Practice today</CardTitle>
            <Target className="h-4 w-4 text-muted/70" aria-hidden />
          </CardHeader>
          <CardBody>
            {practice.today.attempts > 0 ? (
              <>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {practice.today.attempts} <span className="text-sm font-normal text-muted">activities</span>
                </p>
                {practice.today.accuracyPercent !== null && (
                  <p className="mt-1 text-[13px] text-muted">
                    Accuracy today:{" "}
                    <span className="font-semibold text-foreground">{practice.today.accuracyPercent}%</span>
                  </p>
                )}
                <Link href="/student/learning" className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
                  Keep practicing
                </Link>
              </>
            ) : (
              <>
                <p className="text-[13px] text-muted">No practice yet today.</p>
                <Link href="/student/learning" className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
                  Start a lesson
                </Link>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vocabulary review</CardTitle>
            <Repeat className="h-4 w-4 text-muted/70" aria-hidden />
          </CardHeader>
          <CardBody>
            {dueWords > 0 ? (
              <>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {dueWords} <span className="text-sm font-normal text-muted">words ready</span>
                </p>
                <p className="mt-1 text-[13px] text-muted">Scheduled words are waiting for you.</p>
                <Link href="/student/review" className="mt-3 inline-block">
                  <Button size="sm">
                    <Repeat className="h-4 w-4" aria-hidden /> Review now
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-[13px] text-muted">Nothing to review right now.</p>
                <Link href="/student/review" className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
                  Open review
                </Link>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent practice — real attempts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent practice</CardTitle>
          {practice.totals.attempts > 0 && (
            <span className="text-xs text-muted">
              {practice.totals.attempts} attempt{practice.totals.attempts === 1 ? "" : "s"} all-time
              {practice.totals.accuracyPercent !== null && <> · {practice.totals.accuracyPercent}% accuracy</>}
            </span>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {recentAttempts.length === 0 && practice.totals.attempts === 0 ? (
            <EmptyState
              icon={History}
              title="No completed lessons yet."
              description="Open a lesson to start — your activity will show up here."
              className="py-8"
            />
          ) : recentAttempts.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentAttempts.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/student/learn/${r.lessonId}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/5"
                  >
                    {r.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-500" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground" dir="auto">
                        {r.prompt}
                      </span>
                      <span className="block truncate text-xs text-muted">{r.lessonTitle}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{formatDateTime(r.submittedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r.lessonId}>
                  <Link
                    href={`/student/learn/${r.lessonId}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/5"
                  >
                    <LessonStatusIcon status={r.progress} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{r.lessonTitle}</span>
                      <span className="block truncate text-xs text-muted">
                        {r.moduleTitle} · {r.courseTitle}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {formatDateTime(r.lastAccessedAt ?? r.completedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Exams & quizzes — real scheduled/open items and real results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Exams &amp; quizzes</CardTitle>
          <Link href="/student/exams" className="text-[13px] font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardBody>
          {upcomingAssessments.length === 0 && openAssessments.length === 0 && recentResults.length === 0 ? (
            <p className="text-[13px] text-muted">No exams or quizzes yet — your teacher will schedule them.</p>
          ) : (
            <div className="space-y-4">
              {upcomingAssessments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Upcoming</p>
                  <ul className="space-y-2">
                    {upcomingAssessments.map((a) => (
                      <li key={a.id} className="rounded-xl border border-border px-3.5 py-2.5">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Opens {a.startAt ? formatDateTime(a.startAt) : "soon"}
                          {a.durationMinutes ? ` · ${a.durationMinutes} minutes` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openAssessments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Open now</p>
                  <ul className="space-y-2">
                    {openAssessments.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary-subtle/40 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                          <p className="text-xs text-muted">
                            {a.questionsCount} questions
                            {a.durationMinutes ? ` · ${a.durationMinutes} min` : ""}
                            {a.activeAttemptId ? " · in progress" : ""}
                          </p>
                        </div>
                        <Link href={`/student/exams/${a.id}`} className="shrink-0 text-[13px] font-medium text-primary hover:underline">
                          {a.activeAttemptId ? "Resume" : "Start"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {recentResults.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent results</p>
                  <ul className="space-y-2">
                    {recentResults.map((r) => (
                      <li key={r.attemptId}>
                        <Link href={`/student/exams/${r.assessmentId}/result?attempt=${r.attemptId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 hover:bg-muted/5">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
                            <span className="text-xs text-muted">Attempt {r.attemptNumber}</span>
                          </span>
                          {r.percentage !== null ? (
                            <span className="flex shrink-0 items-center gap-2 text-sm">
                              <span className="font-semibold tabular-nums">{r.percentage}%</span>
                              {r.passed ? (
                                <span className="text-xs font-medium text-emerald-700">✓ Passed</span>
                              ) : (
                                <span className="text-xs font-medium text-danger">✗ Not Passed</span>
                              )}
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs text-muted">Submitted</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {quizProgress.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Quiz progress</p>
                  <ul className="space-y-1.5">
                    {quizProgress.map((q) => (
                      <li key={q.id} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-foreground">{q.title}</span>
                        <span className="shrink-0 tabular-nums text-muted">
                          last: <span className="font-semibold text-foreground">{q.lastPercentage}%</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Upcoming classes — honest empty state until scheduling exists */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming classes</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyInline>
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              No upcoming classes scheduled.
            </span>
          </EmptyInline>
        </CardBody>
      </Card>
    </div>
  );
}
