import { Users } from "lucide-react";
import { listGroups, listUsers } from "@/lib/queries";
import { userListQuerySchema } from "@/lib/validations";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { UserFormDialogTrigger } from "@/components/admin/users/user-form-trigger";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { UserRows } from "@/components/admin/users/user-rows";
import type { SessionUser } from "@/types";

interface UsersPageProps {
  viewer: SessionUser;
  basePath: "/admin/users" | "/admin/teachers" | "/admin/students";
  title: string;
  description: string;
  /** When set, the list is locked to one role (Teachers / Students pages). */
  lockedRole?: "TEACHER" | "STUDENT";
  /** Forwarded Next.js searchParams. */
  searchParams?: Record<string, string | string[] | undefined>;
}

/**
 * Shared, server-rendered user-management list used by:
 *  - /admin/users     (all roles, full filters)
 *  - /admin/teachers  (role locked to TEACHER)
 *  - /admin/students  (role locked to STUDENT)
 * Search / filter / pagination are all server-side via the URL.
 */
export async function UsersPage({ viewer, basePath, title, description, lockedRole, searchParams }: UsersPageProps) {
  const sp = (key: string) => {
    const v = searchParams?.[key];
    return typeof v === "string" ? v : undefined;
  };
  const query = userListQuerySchema.parse({
    q: sp("q"),
    role: lockedRole ?? sp("role"),
    groupId: sp("groupId"),
    status: sp("status"),
    page: sp("page"),
  });

  const [result, groups] = await Promise.all([listUsers(query), listGroups()]);
  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }));

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.role) params.set("role", query.role);
    if (query.groupId) params.set("groupId", query.groupId);
    if (query.status) params.set("status", query.status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const hasFilters = Boolean(query.q || query.groupId || query.status);
  const preservedParams: Record<string, string> = {};
  if (lockedRole ?? query.role) preservedParams.role = lockedRole ?? (query.role as string);
  if (query.groupId) preservedParams.groupId = query.groupId;
  if (query.status) preservedParams.status = query.status;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={<UserFormDialogTrigger groups={groupOptions} label="Create user" lockedRole={lockedRole} />}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          label="Search users"
          placeholder="Search name, username, code or email…"
          value={query.q ?? ""}
          preserveParams={preservedParams}
        />
        <UsersFilters
          role={lockedRole ?? query.role}
          groupId={query.groupId}
          status={query.status}
          groups={groupOptions}
          lockedRole={lockedRole}
          basePath={basePath}
          q={query.q}
        />
      </div>

      {result.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={hasFilters ? "No users match your filters." : `No ${lockedRole === "TEACHER" ? "teachers" : lockedRole === "STUDENT" ? "students" : "users"} yet.`}
            description={
              hasFilters
                ? "Try adjusting the search term or clearing a filter."
                : "Create the first account to get started."
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop: table (scrolls horizontally if ever needed) */}
          <div className="hidden overflow-x-auto md:block">
            <UserRows users={result.items} groups={groupOptions} viewerId={viewer.id} layout="table" lockedRole={lockedRole} />
          </div>
          {/* Mobile: cards */}
          <div className="md:hidden">
            <UserRows users={result.items} groups={groupOptions} viewerId={viewer.id} layout="cards" lockedRole={lockedRole} />
          </div>
        </Card>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={hrefForPage}
      />
    </div>
  );
}
