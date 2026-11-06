import type { Metadata } from "next";
import { History } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { listAuditEntries } from "@/lib/queries";
import { auditListQuerySchema } from "@/lib/validations";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "System Settings" };

interface AdminSettingsPageProps {
  searchParams?: Promise<{ page?: string | string[] }>;
}

/**
 * ADMIN — System settings: read-only system information plus the audit log
 * (real entries from the database). More settings arrive in later phases.
 */
export default async function AdminSettingsPage({ searchParams: rawSearchParams }: AdminSettingsPageProps) {
  const searchParams = (await rawSearchParams) ?? {};
  await requirePageUser(["ADMIN"]);
  const query = auditListQuerySchema.parse(searchParams ?? {});
  const audit = await listAuditEntries(query.page);

  const hrefForPage = (page: number) => (page > 1 ? `/admin/settings?page=${page}` : "/admin/settings");

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="System information and the administrative audit trail. Additional settings arrive in later phases."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Product</dt>
                <dd className="font-medium text-foreground">EnglishBridge LMS</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Phase</dt>
                <dd className="font-medium text-foreground">1 — Foundation</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Roles</dt>
                <dd className="font-medium text-foreground">Student · Teacher · Admin</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data policy</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-5 text-muted">
              <li>User accounts are soft-deactivated, never hard-deleted.</li>
              <li>Passwords are stored as bcrypt hashes (12 rounds).</li>
              <li>All administrative actions are recorded in the audit log.</li>
              <li>Credentials and secrets are never written to the audit log.</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Audit log <span className="font-normal text-muted">({audit.total} entries)</span>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {audit.items.length === 0 ? (
            <EmptyState
              icon={History}
              title="No audit entries yet."
              description="Administrative actions — user created, group updated, role changed and similar — will be recorded here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {audit.items.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{entry.action.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>
                      {entry.actor && <span className="text-muted"> — {entry.actor.firstName} {entry.actor.lastName}</span>}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(entry.createdAt)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {entry.entityType}
                    {entry.metadata ? ` · ${entry.metadata}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Pagination
        page={audit.page}
        totalPages={audit.totalPages}
        total={audit.total}
        pageSize={audit.pageSize}
        hrefForPage={hrefForPage}
      />
    </div>
  );
}
