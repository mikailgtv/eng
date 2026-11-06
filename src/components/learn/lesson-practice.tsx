import { Lightbulb } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { getLessonActivitiesForStudent, getPracticeState } from "@/lib/practice";
import { ActivityRunner } from "@/components/practice/activity-runner";
import { QuestionBlock } from "@/components/learn/question-block";
import { Card } from "@/components/ui/card";

interface LessonPracticeProps {
  lessonId: string;
  /** Legacy Phase-2 QUESTION blocks — used when a lesson has no activities. */
  fallbackQuestions: { type: string; data: unknown }[];
  nextLessonHref: string | null;
}

/**
 * The lesson's interactive practice section.
 * - Lessons with PUBLISHED activities get the real activity engine.
 * - Lessons without activities keep the Phase-2 self-check questions
 *   (clearly labelled as not scored) until content is added.
 */
export async function LessonPractice({ lessonId, fallbackQuestions, nextLessonHref }: LessonPracticeProps) {
  const viewer = await requirePageUser(["STUDENT", "ADMIN"]);
  const [activities, state] = await Promise.all([
    getLessonActivitiesForStudent(lessonId),
    getPracticeState(viewer.id, lessonId),
  ]);

  const initialState: Record<string, { status: "NOT_ATTEMPTED" | "COMPLETED" | "CORRECT" | "INCORRECT"; attempts: number; lastAnswer: unknown }> = {};
  for (const s of state.states) initialState[s.activityId] = { status: s.status, attempts: s.attempts, lastAnswer: s.lastAnswer };

  return (
    <section aria-labelledby="practice-heading" className="mt-8">
      <h2 id="practice-heading" className="text-base font-semibold text-foreground">
        Practice
      </h2>
      <p className="mb-4 mt-1 text-[13px] text-muted">
        Try the exercises — you get instant feedback. Mistakes are saved so you can review them.
      </p>

      {activities.length > 0 ? (
        <ActivityRunner activities={activities} initialState={initialState} nextLessonHref={nextLessonHref} />
      ) : fallbackQuestions.length > 0 ? (
        <div>
          <p className="mb-3 text-[13px] text-muted">
            Self-check questions — think first, then reveal the answer. (Interactive exercises are coming to this
            lesson.)
          </p>
          <div className="space-y-3">
            {fallbackQuestions.map((q, i) => {
              const d = q.data as { prompt: string; answer: string; hint?: string };
              return <QuestionBlock key={i} index={i + 1} prompt={d.prompt} answer={d.answer} hint={d.hint} />;
            })}
          </div>
        </div>
      ) : (
        <Card>
          <div className="flex items-start gap-3 p-5">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">No practice exercises yet.</p>
              <p className="mt-0.5 text-[13px] text-muted">Interactive exercises for this lesson are on the way.</p>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
