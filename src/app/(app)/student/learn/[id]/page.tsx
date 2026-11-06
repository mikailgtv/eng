import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Target } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { getLessonForStudent } from "@/lib/learning";
import { getPracticeState } from "@/lib/practice";
import { levelLabel } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { ContentBlocks } from "@/components/learn/content-blocks";
import { LessonPractice } from "@/components/learn/lesson-practice";
import { VocabularyList } from "@/components/learn/vocabulary-list";
import { GrammarPanel } from "@/components/learn/grammar-panel";
import { LessonCompleteButton } from "@/components/learn/lesson-complete-button";
import { LessonFooterNav } from "@/components/learn/lesson-footer-nav";
import { LessonAccessTracker } from "@/components/learn/lesson-access-tracker";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Authorization happens during metadata generation: Next.js resolves
 * `generateMetadata` BEFORE the response stream starts, so an unauthorized
 * or unpublished lesson produces a real HTTP 404 (calling notFound() in the
 * page body alone would render the not-found UI with a 200 status once the
 * shell has already flushed).
 */
export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { id } = await params;
  const viewer = await requirePageUser(["STUDENT", "ADMIN"]);
  const lesson = await getLessonForStudent(viewer, id);
  if (!lesson) notFound();
  return { title: lesson.title };
}

/**
 * The lesson page: content blocks → vocabulary → grammar → practice →
 * completion → prev/next navigation. The student never needs technical
 * knowledge — everything is plain language.
 */
export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;
  const viewer = await requirePageUser(["STUDENT", "ADMIN"]);
  const lesson = await getLessonForStudent(viewer, id);

  // Hidden lessons never render content (defense in depth — metadata already
  // returned 404; this also covers cached/duplicate renders).
  if (!lesson) notFound();

  const positionLabel = `Module ${lesson.position.moduleIndex} of ${lesson.position.moduleCount} · Lesson ${lesson.position.lessonIndexInModule} of ${lesson.position.lessonCountInModule}`;
  const practiceState = await getPracticeState(viewer.id, lesson.id);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <LessonAccessTracker lessonId={lesson.id} />

      {/* Context breadcrumb */}
      <nav aria-label="Course position" className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
        <Link href="/student/learning" className="font-medium text-primary hover:underline">
          {lesson.course.title}
        </Link>
        <span aria-hidden>·</span>
        <span>{lesson.module.title}</span>
        <span aria-hidden>·</span>
        <span className="font-medium text-foreground">{levelLabel(lesson.level.code)} level</span>
      </nav>

      <PageHeader
        title={lesson.title}
        description={lesson.description ?? undefined}
        actions={
          <span className="whitespace-nowrap rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">
            Lesson {lesson.position.lessonIndexInModule} of {lesson.position.lessonCountInModule}
          </span>
        }
      />

      {/* Learning objectives */}
      {lesson.objectives.length > 0 && (
        <section aria-labelledby="objectives-heading" className="mb-7">
          <div className="rounded-xl border border-border bg-primary-subtle/40 p-4 sm:p-5">
            <h2 id="objectives-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" aria-hidden /> In this lesson you will:
            </h2>
            <ul className="mt-2 space-y-1">
              {lesson.objectives.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-foreground">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {o}
                </li>
              ))}
            </ul>
            {lesson.durationMin && (
              <p className="mt-3 text-xs text-muted">Estimated time: about {lesson.durationMin} minutes</p>
            )}
          </div>
        </section>
      )}

      {/* Lesson content (blocks) */}
      <article aria-label="Lesson content">
        <ContentBlocks blocks={lesson.blocks} />
      </article>

      {/* Vocabulary — rendered from real Vocabulary records */}
      {lesson.vocabulary.length > 0 && <VocabularyList items={lesson.vocabulary} />}

      {/* Grammar — rendered from real GrammarContent records */}
      {lesson.grammar.map((g) => (
        <GrammarPanel key={g.id} item={g} />
      ))}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/student/speaking?lessonId=${lesson.id}`} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm">Practice speaking</Link>
        <Link href={`/student/listening?lessonId=${lesson.id}`} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm">Practice listening</Link>
      </div>

      {/* Interactive practice (activity engine; falls back to self-check) */}
      <LessonPractice
        lessonId={lesson.id}
        fallbackQuestions={lesson.practice}
        nextLessonHref={lesson.next ? `/student/learn/${lesson.next.id}` : null}
      />

      {/* Completion (server-enforced completion rule) */}
      <div className="mt-8">
        <LessonCompleteButton
          lessonId={lesson.id}
          initialStatus={lesson.progress.status}
          requiredRemaining={practiceState.requiredRemaining}
          requiredTotal={practiceState.requiredTotal}
          nextHref={lesson.next ? `/student/learn/${lesson.next.id}` : null}
          nextTitle={lesson.next?.title ?? null}
        />
      </div>

      {/* Prev / next navigation (sticky on mobile) */}
      <LessonFooterNav prev={lesson.prev} next={lesson.next} positionLabel={positionLabel} />
    </div>
  );
}
