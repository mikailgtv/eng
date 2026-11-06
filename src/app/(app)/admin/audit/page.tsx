import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { formatInTimeZone } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit" };

export default async function IdentityAuditPage() {
  await requirePageUser(["ADMIN"]);
  const rows = await prisma.auditLog.findMany({ where: { entityType: "IDENTITY" }, orderBy: { createdAt: "desc" }, take: 40, include: { actor: { select: { firstName: true, lastName: true } } } });
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Identity audit" description="Role, permission, invitation and security changes. Passwords and tokens are not stored here." />
      <ul className="space-y-2 text-sm">
        {rows.length === 0 ? <li className="text-muted">No identity audit entries yet.</li> : rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border px-3 py-2">{row.action} · {row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : "System"} · {formatInTimeZone(row.createdAt, "Asia/Tehran")}</li>
        ))}
      </ul>
    </div>
  );
}
