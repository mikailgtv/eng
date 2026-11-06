import Link from "next/link";
import { BookMarked, CheckCircle2, Ear, ListChecks, Puzzle, Target, TrendingUp, Mic, Award, CalendarDays } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LessonStatusIcon } from "@/components/learn/lesson-status-icon";
import { formatDate } from "@/lib/utils";
import type { LearningSummary } from "@/types/learning";
import type { PracticeStats } from "@/lib/practice";
import { DailyGoalCard } from "./daily-goal-card";
import { DailyActivityChart } from "./daily-activity-chart";

type VocabCounts = { learning: number; review: number; mastered: number; due: number; touched: number };
type AssessmentHistory = {
  attemptId: string;
  assessmentId: string;
  title: string;
  type: string;
  attemptNumber: number;
  submittedAt: Date | null;
  status: string;
  percentage: number | null;
  passed: boolean | null;
  resultsVisible: boolean;
};
type DayHistory = { date: string; label: string; lessons: number; reviews: number; activities: number; speaking: number };
type SpeakingStats = { speakingCompletedToday: number; assessedCompletedToday: number; speakingTotal: number };

interface StudentProgressProps {
  learning: LearningSummary;
  practice: PracticeStats;
  vocab: VocabCounts;
  // Phase 57 new — optional for backwards compat
  goal?: { type: "LESSONS" | "REVIEW_CARDS" | "ACTIVITIES"; value: number; enabled: boolean };
  progress?: { type: "LESSONS" | "REVIEW_CARDS" | "ACTIVITIES"; target: number; completed: number; remaining: number; percent: number; enabled: boolean; dayKey: string };
  history?: DayHistory[];
  speakingStats?: SpeakingStats;
  assessments?: AssessmentHistory[];
}

/**
 * MY PROGRESS — real progress dashboard (Phase 57).
 * Every number comes from persisted records with a clear definition.
 * No invented grades, no combined incompatible scores, no minutes from page-open time.
 */
export function StudentProgress({ learning, practice, vocab, goal, progress, history, speakingStats, assessments }: StudentProgressProps) {
  if (learning.courses.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={TrendingUp}
          title="No course has been assigned yet."
          description="When your group gets a course, your progress will appear here. Every metric here is calculated from real completion records — see definitions below."
        />
      </Card>
    );
  }

  const hasGoal = goal && progress && history && speakingStats;

  return (
    <div className="space-y-6">
      {/* Daily goal — Phase 57 core */}
      {hasGoal ? (
        <DailyGoalCard initialGoal={goal} initialProgress={progress} />
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-muted">Daily goal data is loading. Your goal will appear here once your preferences are saved. Day boundaries are UTC midnight.</p>
          </CardBody>
        </Card>
      )}

      {/* Daily activity — last 7 days real timestamps */}
      {history && <DailyActivityChart history={history} />}

      {/* Lesson progress — completed/remaining, overall % */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Your level: {learning.activeCourse?.level.displayName ?? "—"}</CardTitle>
          <span className="text-xs text-muted">{learning.activeCourse ? `${learning.activeCourse.title}` : "No active course"}</span>
        </CardHeader>
        <CardBody>
          <ProgressBar value={learning.totals.percent} label="Overall lesson completion" size="lg" />
          <p className="mt-2 text-[13px] text-muted">
            You completed <span className="font-semibold tabular-nums text-foreground">{learning.totals.completedLessons}</span> of{" "}
            <span className="font-semibold tabular-nums text-foreground">{learning.totals.totalLessons}</span> lessons (
            <span className="font-semibold tabular-nums text-foreground">{learning.totals.percent}%</span>) ·{" "}
            <span className="tabular-nums">{learning.totals.totalLessons - learning.totals.completedLessons}</span> remaining
            {learning.totals.startedLessons > 0 && (
              <> · <span className="tabular-nums">{learning.totals.startedLessons}</span> in progress</>
            )}.
            Definition: lessons with <span className="font-medium text-foreground">lesson_progress status = COMPLETED</span> counted once (unique per student+lesson). Percent = completed / total publish lessons in all assigned courses. Keep going!
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            <Link href="/student/learning" className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-3 py-2 font-medium text-foreground hover:bg-muted/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              Continue learning
            </Link>
            <Link href="/student/review" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 py-2 font-medium text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              Review vocabulary
            </Link>
          </p>
        </CardBody>
      </Card>

      {/* Practice statistics — real attempt records */}
      <section aria-labelledby="practice-stats">
        <h2 id="practice-stats" className="mb-3 text-[15px] font-semibold text-foreground">Your practice</h2>
        <p className="mb-3 text-xs text-muted">Definition: practice totals count <span className="font-medium text-foreground">activity_attempt rows where submittedAt is set</span>. Accuracy = correct / scored (isCorrect not null). Speaking prompts have isCorrect = null and are never scored.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={ListChecks} label="Activities practiced (distinct)" value={practice.totals.distinctActivitiesPracticed} hint="Distinct activityId with any attempt" />
          <Stat icon={Target} label="Overall accuracy" value={practice.totals.accuracyPercent === null ? "—" : `${practice.totals.accuracyPercent}%`} hint="Correct / scored attempts only" />
          <Stat icon={CheckCircle2} label="Correct answers" value={practice.totals.correctAttempts} hint="isCorrect = true" />
          <Stat icon={Ear} label="Listening done" value={practice.totals.listeningCompleted} hint="LISTEN_AND_CHOOSE/TYPE correct" />
          <Stat icon={Puzzle} label="Grammar practiced" value={practice.totals.grammarConceptsPracticed} hint="Distinct grammarId touched" />
          <Stat icon={BookMarked} label="Words practiced" value={practice.totals.vocabularyItemsPracticed} hint="Distinct vocabulary via activities" />
        </div>
      </section>

      {/* Speaking — distinguished from assessed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted" aria-hidden /> Speaking
          </CardTitle>
          <span className="text-xs text-muted">Not graded · completion only</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-xs text-muted">Speaking activities completed today (UTC)</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{speakingStats ? speakingStats.speakingCompletedToday : "—"}</p>
              <p className="mt-1 text-xs text-muted">Definition: activity_attempt with isCorrect = null (SPEAKING_PROMPT self-reported) where submittedAt is today UTC. These are <strong>not grades</strong> — they show you practiced.</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-xs text-muted">Speaking total, all time</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{speakingStats ? speakingStats.speakingTotal : practice.totals.attempts - practice.totals.scoredAttempts > 0 ? practice.totals.attempts - practice.totals.scoredAttempts : 0}</p>
              <p className="mt-1 text-xs text-muted">Total speaking prompts you marked as practiced. For comparison, assessed activities today: {speakingStats ? speakingStats.assessedCompletedToday : practice.today.scoredAttempts}.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Speaking completion is stored as <span className="font-medium text-foreground">status COMPLETED, isCorrect = null</span> and never shown as a percentage or grade. The “Practiced — great work!” message is confirmation, not a score.
          </p>
          <Link href="/student/speaking" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            Practice speaking
          </Link>
        </CardBody>
      </Card>

      {/* Vocabulary review state */}
      <Card>
        <CardHeader>
          <CardTitle>Vocabulary</CardTitle>
          <Link href="/student/review" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            Review now ({vocab.due} ready)
          </Link>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-xs text-muted">Definitions: Due = vocabulary_review where dueAt ≤ now (server UTC). Learning/Review/Mastered = status counts. Interval: 1→1d, 3→7→14→30 days. Touched = cards you have reviewed at least once.</p>
          {vocab.touched === 0 ? (
            <p className="text-[13px] text-muted">No vocabulary practice yet — review flashcards and vocabulary exercises will build your word list here. Start a lesson with vocabulary, or open Review now.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-sky-50 px-2 py-3">
                <dt className="text-xs text-muted">Learning</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-sky-800">{vocab.learning}</dd>
              </div>
              <div className="rounded-xl bg-amber-50 px-2 py-3">
                <dt className="text-xs text-muted">In review</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-amber-800">{vocab.review}</dd>
              </div>
              <div className="rounded-xl bg-emerald-50 px-2 py-3">
                <dt className="text-xs text-muted">Mastered</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-800">{vocab.mastered}</dd>
              </div>
            </dl>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-xs tabular-nums text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden /> Learning: {vocab.learning}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Review: {vocab.review}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Mastered: {vocab.mastered}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden /> Due now: {vocab.due}</span>
          </div>
        </CardBody>
      </Card>

      {/* Assessment attempts — no invented scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted" aria-hidden /> Assessments
          </CardTitle>
          <Link href="/student/exams" className="text-xs font-medium text-primary hover:underline">View all exams</Link>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-xs text-muted">Definitions: Each attempt is a real <span className="font-medium text-foreground">assessment_attempt row</span> with server-graded score/percentage/passed when submitted. Inaccessible results show “Submitted” only (no invented grade). Latest 5 shown.</p>
          {!assessments || assessments.length === 0 ? (
            <p className="text-sm text-muted">No assessment attempts yet. When your teacher schedules an exam or quiz, your attempts and results will appear here. Study minutes from page-open time are not used.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {assessments.slice(0, 5).map((a) => (
                <li key={a.attemptId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted">Attempt {a.attemptNumber} · {a.submittedAt ? formatDate(a.submittedAt) : "in progress"} · {a.type}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {a.resultsVisible && a.percentage !== null ? (
                      <>
                        <p className="text-sm font-semibold tabular-nums text-foreground">{a.percentage}%</p>
                        <p className={`text-xs font-medium ${a.passed ? "text-emerald-700" : "text-danger"}`}>{a.passed ? "Passed" : "Not passed"}</p>
                      </>
                    ) : (
                      <p className="text-xs font-medium text-muted">{a.status === "SUBMITTED" || a.status === "GRADED" ? "Submitted — results hidden by teacher" : a.status}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Assessment scores are never averaged with practice or speaking. Speaking practice is completion only and does not affect assessment grades.</p>
        </CardBody>
      </Card>

      {/* Limitation note — omitted metrics */}
      <Card>
        <CardBody>
          <p className="text-xs font-semibold text-foreground">What is not shown</p>
          <p className="mt-1 text-xs text-muted">
            Study minutes from page-open time are not reported because the app does not record a defensible active-learning timer for every page. Lesson time (timeSpentSec) is best-effort and not used as a daily goal. If you need minutes, ask your teacher — we show only completed lessons, real review actions and submitted practice with UTC timestamps.
          </p>
        </CardBody>
      </Card>

      {/* Per-course / per-module breakdown */}
      {learning.courses.map((course) => (
        <section key={course.id} aria-label={course.title}>
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">{course.title}</h2>
          <div className="space-y-3">
            {course.modules.map((module) => {
              const done = module.lessons.filter((l) => l.progress === "COMPLETED").length;
              const percent = module.lessons.length === 0 ? 0 : (done / module.lessons.length) * 100;
              return (
                <Card key={module.id}>
                  <CardBody>
                    <ProgressBar value={percent} label={`${module.title} (${done}/${module.lessons.length})`} />
                    <p className="mt-1 text-xs text-muted">Definition: {done} lessons with status COMPLETED in this module. Each lesson counts once.</p>
                  </CardBody>
                </Card>
              );
            })}
            {course.modules.length === 0 && (
              <Card>
                <EmptyState icon={TrendingUp} title="No lessons are currently available in this course." />
              </Card>
            )}
          </div>
        </section>
      ))}

      {/* Recent completions */}
      <Card>
        <CardHeader>
          <CardTitle>Recently completed</CardTitle>
          <span className="text-xs text-muted">Lessons and practice with links</span>
        </CardHeader>
        <CardBody className="p-0">
          {learning.recent.filter((r) => r.progress === "COMPLETED").length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No completed lessons yet."
              description="Finish a lesson and it will appear here — most recent first, with a link to continue."
              action={
                <Link href="/student/learning" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  Go to My Learning
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {learning.recent
                .filter((r) => r.progress === "COMPLETED")
                .map((r) => (
                  <li key={r.lessonId}>
                    <Link
                      href={`/student/learn/${r.lessonId}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                    >
                      <LessonStatusIcon status={r.progress} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{r.lessonTitle}</span>
                        <span className="block truncate text-xs text-muted">{r.moduleTitle} · {r.courseTitle}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{r.completedAt ? formatDate(r.completedAt) : ""}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Recent practice attempts with lesson links */}
      {practice.totals.attempts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent practice activity</CardTitle>
            <span className="text-xs text-muted">{practice.totals.attempts} attempts all-time · links to lessons</span>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {learning.recent.slice(0, 5).map((r) => (
                <li key={r.lessonId}>
                  <Link href={`/student/learn/${r.lessonId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50">
                    <LessonStatusIcon status={r.progress} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{r.lessonTitle}</span>
                      <span className="block truncate text-xs text-muted">{r.moduleTitle}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{r.lastAccessedAt ? formatDate(r.lastAccessedAt) : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3.5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted" aria-hidden />
        <p className="text-xs text-muted">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-tight text-muted">{hint}</p>}
    </div>
  );
}
