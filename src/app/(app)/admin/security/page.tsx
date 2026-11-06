import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { PageHeader } from "@/components/ui/page-header";
import { securitySummary, identityAnalytics } from "@/lib/identity/service";
import { formatInTimeZone } from "@/lib/utils";
import { IdentityAction } from "@/components/identity/actions";

export const metadata: Metadata = { title: "Security" };

export default async function AdminSecurityPage() {
  const actor = await requirePageUser(["ADMIN"]);
  const [summary, analytics] = await Promise.all([securitySummary(actor), identityAnalytics(actor)]);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader title="Security center" description="Counts and recent events. This page does not guess why someone signed in or failed." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Failed sign-ins, 7 days", summary.failed],
          ["Locked accounts", summary.locked],
          ["Active sessions", summary.sessions],
          ["MFA methods on", summary.mfa],
          ["Active users", analytics.activeUsers],
          ["Waiting to activate", analytics.pendingActivation],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="text-sm font-semibold">Account status</h2>
        <ul className="mt-2 text-sm">{summary.statusGroups.map((row) => <li key={row.status}>{row.status}: {row._count._all}</li>)}</ul>
        <h2 className="mt-3 text-sm font-semibold">Role distribution</h2>
        <ul className="mt-2 text-sm">{summary.roleGroups.map((row) => <li key={row.role}>{row.role}: {row._count._all}</li>)}</ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">No sign-in for {summary.dormantDays} days</h2>
        <p className="text-sm text-muted">{summary.autoSuspend ? "Automatic suspension is on." : "Automatic suspension is off. This list is informational."}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {summary.dormant.length === 0 ? <li>No matching accounts.</li> : summary.dormant.map((user) => <li key={user.id}>{user.firstName} {user.lastName} · {user.username} · {formatInTimeZone(user.lastLoginAt, "Asia/Tehran")}</li>)}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Recent security events</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {summary.events.length === 0 ? <li>No events yet.</li> : summary.events.map((event) => <li key={event.id}>{event.type} · {event.user ? `${event.user.firstName} ${event.user.lastName}` : "Unknown"} · {formatInTimeZone(event.createdAt, "Asia/Tehran")}</li>)}
        </ul>
      </section>
      <p className="text-sm"><Link className="underline" href="/admin/account">Your sessions</Link> · <Link className="underline" href="/admin/access-reviews">Access reviews</Link></p>
      <IdentityAction title="Run dormant policy" description="Suspends non-admin accounts only when the organization policy is explicitly enabled." action="/api/security" confirmLabel="Run policy" danger fields={[]} />
    </div>
  );
}
