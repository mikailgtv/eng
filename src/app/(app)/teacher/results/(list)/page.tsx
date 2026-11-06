import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, SearchX, XCircle } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { listResultsForStaff } from "@/lib/assessment/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Assessment results" };

interface PageProps {
  searchParams?: Promise<{
    group?: string;
    assessment?: string;
    result?: string;
    from?: string;
    to?: string;
    page?: string;
    q?: string;
  }>;
}

const PAGE_SIZE = 25;

/**
 * Teacher results for their assigned groups (server-enforced scoping):
 * filter by group, assessment, result and date range. Admins see all groups.
 */
export default async function TeacherResultsPage({ searchParams: rawSearchParams }: PageProps) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };

  const groupId = searchParams?.group ?? "";
  const assessmentId = searchParams?.assessment ?? "";
  const result = searchParams?.result ?? "";
  const from = searchParams?.from ?? "";
  const to = searchParams?.to ?? "";
  const q = (searchParams?.q ?? "").trim();
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const [data, groups, assessments] = await Promise.all([
    listResultsForStaff(viewer, {
      groupId: groupId || undefined,
      assessmentId: assessmentId || undefined,
      result: result || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(`${to}T23:59:59Z`) : undefined,
      page,
      q: q || undefined,
    }),
    prisma.learningGroup.findMany({
      where: user.role === "TEACHER" ? { teacherId: user.id } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.assessment.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, type: true },
      take: 100,
    }),
  ]);

  const qs = (extra: Record<string, string> = {}) => {
    const sp = new URLSearchParams({
      ...(groupId && { group: groupId }),
      ...(assessmentId && { assessment: assessmentId }),
      ...(result && { result }),
      ...(from && { from }),
      ...(to && { to }),
      ...(q && { q }),
      ...extra,
    });
    // An explicit empty value removes the parameter (used by "Clear search").
    for (const [key, value] of [...sp.entries()]) if (!value) sp.delete(key);
    const query = sp.toString();
    return query ? `/teacher/results?${query}` : "/teacher/results";
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader title="Assessment results" description="Results for your groups — filter and open any attempt." />
      <p className="mb-4 text-sm text-muted">
        Speaking and listening practice is separate from these exam results.{" "}
        <Link className="underline" href="/teacher/speaking">Speaking</Link>
        {" · "}
        <Link className="underline" href="/teacher/listening">Listening</Link>
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          label="Search results"
          placeholder="Search student or assessment…"
          value={q}
          preserveParams={{ group: groupId, assessment: assessmentId, result, from, to }}
        />
        {q && (
          <Link href={qs({ q: "" })} className="text-[13px] font-medium text-primary hover:underline">
            Clear search
          </Link>
        )}
      </div>

      <form method="get" action="/teacher/results" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-6">
        <input type="hidden" name="q" value={q} />
        <select name="group" defaultValue={groupId} aria-label="Filter by group" className="h-10 rounded-lg border border-border bg-surface px-3 text-[13px]">
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select name="assessment" defaultValue={assessmentId} aria-label="Filter by assessment" className="h-10 rounded-lg border border-border bg-surface px-3 text-[13px] sm:col-span-2">
          <option value="">All assessments</option>
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <select name="result" defaultValue={result} aria-label="Filter by result" className="h-10 rounded-lg border border-border bg-surface px-3 text-[13px]">
          <option value="">All results</option>
          <option value="PASSED">Passed</option>
          <option value="NOT_PASSED">Not Passed</option>
        </select>
        <input type="date" name="from" defaultValue={from} aria-label="From date" className="h-10 rounded-lg border border-border bg-surface px-3 text-[13px]" />
        <div className="flex gap-2">
          <input type="date" name="to" defaultValue={to} aria-label="To date" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-[13px]" />
          <button type="submit" className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
            Filter
          </button>
        </div>
      </form>

      <Card>
        <CardBody className="p-0">
          {data.rows.length === 0 ? (
            q ? (
              <EmptyState
                icon={SearchX}
                title={`No results match “${q}”.`}
                description="Search matches student names, usernames, student codes and assessment titles. Try a different term, or clear the search."
                className="py-10"
                action={
                  <Link href={qs({ q: "" })}>
                    <Button variant="secondary" size="sm">
                      Clear search
                    </Button>
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="No results match these filters."
                description="Results appear here when students finish an assessment."
                className="py-10"
              />
            )
          ) : (
            <>
            <ul className="space-y-2 p-3 md:hidden">
              {data.rows.map((r) => (
                <li key={r.attemptId} className="rounded-xl border border-border p-3 text-sm">
                  <Link href={`/teacher/results/${r.attemptId}`} className="font-medium text-primary">{r.studentName}</Link>
                  <p>{r.assessmentTitle}</p>
                  <p className="text-muted">{r.groupName ?? "No group"} · {r.percentage !== null ? `${r.percentage}%` : "No score"} · {r.passed === true ? "Passed" : r.passed === false ? "Not passed" : r.status}</p>
                  <p className="text-xs text-muted">{formatDateTime(r.submittedAt)}</p>
                </li>
              ))}
            </ul>
            <div className="table-scroll hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Assessment</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.rows.map((r) => (
                    <tr key={r.attemptId} className="hover:bg-muted/5">
                      <td className="px-4 py-3 font-medium text-foreground">{r.studentName}</td>
                      <td className="px-4 py-3 text-muted">{r.groupName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="block max-w-52 truncate text-foreground">{r.assessmentTitle}</span>
                        <span className="text-xs text-muted">
                          {r.assessmentType === "EXAM" ? "Exam" : "Quiz"} · attempt {r.attemptNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">{r.percentage !== null ? `${r.percentage}%` : "—"}</td>
                      <td className="px-4 py-3">
                        {r.passed === true ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" aria-hidden /> Passed
                          </span>
                        ) : r.passed === false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger">
                            <XCircle className="h-3 w-3" aria-hidden /> Not Passed
                          </span>
                        ) : (
                          <span className="text-xs text-muted">{r.status === "IN_PROGRESS" ? "In progress" : "Submitted"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted">{formatDateTime(r.submittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/teacher/results/${r.attemptId}`} className="text-[13px] font-medium text-primary hover:underline">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardBody>
      </Card>
      <div className="mt-4">
        <Pagination
          page={data.page}
          totalPages={Math.max(1, Math.ceil(data.total / data.pageSize))}
          total={data.total}
          pageSize={data.pageSize}
          hrefForPage={(p) => qs({ page: String(p) })}
        />
      </div>
    </div>
  );
}