/**
 * Shared learning-domain view types (client-safe: no server imports).
 */
import type { ProgressStatus } from "@/lib/constants";

export type LevelInfo = {
  id: string;
  code: string;
  name: string;
  displayName: string;
  status: string;
  order: number;
};

export type LessonRef = {
  id: string;
  title: string;
  description: string | null;
  durationMin: number | null;
  order: number;
  progress: ProgressStatus;
  primarySkill?: string | null;
  lockedReason?: string | null;
};

export type ModuleRef = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonRef[];
};

export type CourseOverview = {
  id: string;
  title: string;
  description: string | null;
  isDemo: boolean;
  level: LevelInfo;
  modules: ModuleRef[];
  /** Published-lesson totals for this course (real calculated progress). */
  totalLessons: number;
  completedLessons: number;
  startedLessons: number;
  percent: number;
};

/** The lesson the student should open now, plus what follows it. */
export type ContinueLearning = {
  current: LessonRef & { courseTitle: string; moduleTitle: string };
  next: (LessonRef & { courseTitle: string }) | null;
};

export type RecentLesson = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  progress: ProgressStatus;
  lastAccessedAt: Date | null;
  completedAt: Date | null;
};

export type LearningSummary = {
  courses: CourseOverview[];
  /** The course the student is currently working through (most progress). */
  activeCourse: CourseOverview | null;
  continueLearning: ContinueLearning | null;
  recent: RecentLesson[];
  /** Real overall numbers across all assigned courses. */
  totals: { totalLessons: number; completedLessons: number; startedLessons: number; percent: number };
  /** Consecutive active days ending today (or yesterday), from real activity. */
  streakDays: number;
};

export type VocabItem = {
  id: string;
  word: string;
  translation: string | null;
  pronunciation: string | null;
  phonetic: string | null;
  exampleSentence: string | null;
  audioUrl: string | null;
};

export type GrammarItem = {
  id: string;
  title: string;
  explanation: string | null;
  patterns: string[];
  examples: string[];
};

export type LessonPosition = {
  /** e.g. 2 of 6 modules */
  moduleIndex: number;
  moduleCount: number;
  /** e.g. 3 of 5 lessons in this module */
  lessonIndexInModule: number;
  lessonCountInModule: number;
};

export type LessonView = {
  id: string;
  title: string;
  description: string | null;
  objectives: string[];
  durationMin: number | null;
  course: { id: string; title: string };
  module: { id: string; title: string };
  level: LevelInfo;
  position: LessonPosition;
  /** Parsed content blocks in order (QUESTION blocks are separated out). */
  blocks: { type: string; data: unknown }[];
  practice: { type: string; data: unknown }[];
  vocabulary: VocabItem[];
  grammar: GrammarItem[];
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  progress: { status: ProgressStatus; completedAt: Date | null; timeSpentSec: number | null };
};
