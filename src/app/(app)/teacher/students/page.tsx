import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer, attendanceSummary, latestScores } from "@/lib/teaching/queries";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar } from "@/components/ui/avatar";
import { LevelBadge, StatusBadge } from "@/components/ui/badge";
import { fullName } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

interface TeacherStudentsPageProps {
  searchParams?: Promise<{ q?: string | string[]; groupId?: string | string[] }>;
}

/** Students in the teacher's assigned groups, with search + group filter. */
export default async function TeacherStudentsPage({ searchParams: rawSearchParams }: TeacherStudentsPageProps) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["TEACHER", "ADMIN"]);

  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const groupId = typeof searchParams?.groupId === "string" ? searchParams.groupId : "";

  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const assigned = await groupsForViewer(viewer);
  const groupIds = assigned.map((g) => g.id);
  const page = Math.max(1, Number(searchParams && "page" in searchParams ? (searchParams as { page?: string }).page : 1) || 1);
  const pageSize = 20;
  const where = {
    role: "STUDENT" as const,
    groupId: { in: groupId && groupIds.includes(groupId) ? [groupId] : groupIds },
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { employeeCode: { contains: q } },
          ],
        }
      : {}),
  };
  const [students, total] = groupIds.length
    ? await Promise.all([
        prisma.user.findMany({
          where,
          include: { group: { select: { id: true, name: true } } },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.user.count({ where }),
      ])
    : [[], 0];
  const [attendance, scores] = await Promise.all([
    attendanceSummary(students.map((s) => s.id)),
    latestScores(students.map((s) => s.id)),
  ]);
  const groups = assigned;

  return (
    <div>
      <PageHeader
        title="Students"
        description="Students in the learning groups you teach."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          label="Search students"
          placeholder="Search by name or employee code…"
          value={q}
          param="q"
          preserveParams={groupId ? { groupId } : {}}
        />
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter by group">
          <FilterChip href="/teacher/students" active={!groupId} label="All groups" />
          {groups.map((g) => (
            <FilterChip
              key={g.id}
              href={`/teacher/students?groupId=${g.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              active={groupId === g.id}
              label={g.name}
            />
          ))}
        </nav>
      </div>

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            title={q || groupId ? "No students match your search." : "No students in your groups yet."}
            description={
              q || groupId
                ? "Try a different search term or group filter."
                : "Once an administrator assigns students to your groups, they will appear here."
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop: table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/5 text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Student</th>
                  <th scope="col" className="px-4 py-3 font-medium">Employee code</th>
                  <th scope="col" className="px-4 py-3 font-medium">Group</th>
                  <th scope="col" className="px-4 py-3 font-medium">Level</th>
                  <th scope="col" className="px-4 py-3 font-medium">Attendance</th>
                  <th scope="col" className="px-4 py-3 font-medium">Latest quiz</th>
                  <th scope="col" className="px-4 py-3 font-medium">Latest exam</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-muted/5">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar person={s} size="sm" />
                        <span className="font-medium text-foreground">{fullName(s)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">{s.employeeCode}</td>
                    <td className="px-4 py-3 text-muted">{s.group?.name ?? "—"}</td>
                    <td className="px-4 py-3"><LevelBadge level={s.englishLevel} /></td>
                    <td className="px-4 py-3 tabular-nums text-muted">{attendance.get(s.id)?.percent ?? "—"}{attendance.get(s.id)?.percent != null ? "%" : ""}</td>
                    <td className="px-4 py-3 text-muted">{scores.get(s.id)?.quiz ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{scores.get(s.id)?.exam ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/teacher/students/${s.id}`} className="text-[13px] font-medium text-primary hover:underline">
                        View profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: cards */}
          <ul className="grid grid-cols-1 gap-3 md:hidden">
            {students.map((s) => (
              <li key={s.id}>
                <Link href={`/teacher/students/${s.id}`} className="block h-full">
                  <Card className="h-full p-4 transition-shadow hover:shadow-card-hover">
                    <div className="flex items-center gap-3">
                      <Avatar person={s} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{fullName(s)}</p>
                        <p className="truncate text-xs tabular-nums text-muted">{s.employeeCode}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="truncate">{s.group?.name ?? "No group"}</span>
                      <LevelBadge level={s.englishLevel} />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          {total > pageSize && (
            <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Student pages">
              <span className="text-muted">{total} students</span>
              <span className="flex gap-2">
                {page > 1 && <Link className="underline" href={`/teacher/students?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${groupId ? `&groupId=${groupId}` : ""}`}>Previous</Link>}
                {page * pageSize < total && <Link className="underline" href={`/teacher/students?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${groupId ? `&groupId=${groupId}` : ""}`}>Next</Link>}
              </span>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors " +
        (active
          ? "border-primary/30 bg-primary-subtle text-primary"
          : "border-border bg-surface text-muted hover:bg-muted/10 hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}
