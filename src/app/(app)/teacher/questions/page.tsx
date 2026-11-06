import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/assessment/registry";

export const metadata: Metadata = { title: "Question Bank" };

const PAGE_SIZE = 15;

interface PageProps {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    skill?: string;
    difficulty?: string;
    level?: string;
    lesson?: string;
    status?: string;
    page?: string;
  }>;
}

/**
 * Question bank management: search + filters + pagination. Teachers and
 * admins can create, edit and archive questions. The list never loads the
 * whole bank — queries are paginated.
 */
export default async function QuestionBankPage({ searchParams: rawSearchParams }: PageProps) {
  const searchParams = (await rawSearchParams) ?? {};
  await requirePageUser(["TEACHER", "ADMIN"]);

  const q = searchParams?.q ?? "";
  const type = searchParams?.type ?? "";
  const skill = searchParams?.skill ?? "";
  const difficulty = searchParams?.difficulty ?? "";
  const levelId = searchParams?.level ?? "";
  const lessonId = searchParams?.lesson ?? "";
  const status = searchParams?.status === "ARCHIVED" ? "ARCHIVED" : searchParams?.status === "DRAFT" ? "DRAFT" : "PUBLISHED";
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const where: any = { status };
  if (q) where.questionText = { contains: q };
  if (type) where.type = type;
  if (skill) where.skill = skill;
  if (difficulty) where.difficulty = difficulty;
  if (levelId) where.levelId = levelId;
  if (lessonId) where.lessonId = lessonId;

  const [rows, total, levels, lessons] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        options: { select: { text: true, isCorrect: true }, orderBy: { order: "asc" } },
        lesson: { select: { title: true, module: { select: { course: { select: { title: true } } } } } },
        level: { select: { code: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.question.count({ where }),
    prisma.level.findMany({ orderBy: { order: "asc" }, select: { id: true, code: true, displayName: true } }),
    prisma.lesson.findMany({
      include: { module: { include: { course: { select: { title: true } } } } },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryString = (extra: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(q && { q }), ...(type && { type }), ...(skill && { skill }), ...(difficulty && { difficulty }), ...(levelId && { level: levelId }), ...(lessonId && { lesson: lessonId }), status, ...extra });
    return `/teacher/questions?${sp.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Question Bank"
        description="Reusable questions for quizzes and exams."
        actions={
          <Link href="/teacher/questions/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden /> New question
            </Button>
          </Link>
        }
      />

      <form method="get" action="/teacher/questions" className="mb-5 space-y-3">
        <SearchInput label="Search questions" placeholder="Search by text…" value={q} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <FilterSelect name="type" value={type} options={[["", "All types"], ...Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => [v, l])]} />
          <FilterSelect name="skill" value={skill} options={[["", "All skills"], ["VOCABULARY", "Vocabulary"], ["GRAMMAR", "Grammar"], ["READING", "Reading"], ["LISTENING", "Listening"], ["SPEAKING", "Speaking"], ["WRITING", "Writing"]]} />
          <FilterSelect name="difficulty" value={difficulty} options={[["", "All levels of difficulty"], ["EASY", "Easy"], ["MEDIUM", "Medium"], ["HARD", "Hard"]]} />
          <FilterSelect name="status" value={status} options={[["PUBLISHED", "Published"], ["DRAFT", "Draft"], ["ARCHIVED", "Archived"]]} />
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
            Apply filters
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect name="level" value={levelId} options={[["", "All levels"], ...levels.map((l) => [l.id, l.displayName ?? l.code])]} />
          <FilterSelect name="lesson" value={lessonId} options={[["", "All lessons"], ...lessons.map((l) => [l.id, `${l.module.course.title} — ${l.title}`])]} />
        </div>
      </form>

      <Card>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={CircleHelp}
              title="No questions match."
              description="Try clearing filters, or create a new question."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/teacher/questions/${item.id}`}
                    className="block px-5 py-3.5 transition-colors hover:bg-muted/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" dir="auto">
                        {item.questionText}
                      </p>
                      <span className="text-xs tabular-nums text-muted">{item.points} pt</span>
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>{QUESTION_TYPE_LABELS[item.type as QuestionType] ?? item.type}</span>
                      <span>{item.difficulty.charAt(0) + item.difficulty.slice(1).toLowerCase()}</span>
                      {item.skill && <span>{item.skill.charAt(0) + item.skill.slice(1).toLowerCase()}</span>}
                      {item.lesson && (
                        <span className="truncate">
                          {item.lesson.module.course.title} — {item.lesson.title}
                        </span>
                      )}
                      <span>{statusLabel(item.status)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} hrefForPage={(p) => queryString({ page: String(p) })} />
      </div>
    </div>
  );
}

function FilterSelect({ name, value, options }: { name: string; value: string; options: (string[])[] }) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground"
    >
      {options.map(([v, l]) => (
        <option key={v + l} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function statusLabel(status: string) {
  return status === "PUBLISHED" ? "Published" : status === "DRAFT" ? "Draft" : "Archived";
}
