import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { IdentityAction } from "@/components/identity/actions";
import { formatInTimeZone } from "@/lib/utils";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  await requirePageUser(["ADMIN"]);
  const rows = await prisma.userInvitation.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeader title="Invitations" description="The invite link is shown once. Email delivery is not configured, so copy the link for the person you invited." />
      <IdentityAction title="Invite a user" action="/api/invitations" confirmLabel="Create invitation" fields={[{ name: "email", label: "Email", type: "email" }, { name: "role", label: "Role", defaultValue: "TEACHER" }, { name: "firstName", label: "First name", required: false }, { name: "lastName", label: "Last name", required: false }, { name: "groupId", label: "Group id", required: false }]} />
      <ul className="space-y-2 text-sm">
        {rows.length === 0 ? <li className="text-muted">No invitations yet.</li> : rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border px-3 py-2">{row.email} · {row.role} · expires {formatInTimeZone(row.expiresAt, "Asia/Tehran")} · {row.usedAt ? "Used" : row.revokedAt ? "Revoked" : "Open"}</li>
        ))}
      </ul>
    </div>
  );
}
