import Link from "next/link";
import { userDetail } from "@/lib/identity/service";
import { formatInTimeZone } from "@/lib/utils";
import type { SessionUser } from "@/types";

export async function UserFacts({ actor, userId }: { actor: SessionUser; userId: string }) {
  const detail = await userDetail(actor, userId);
  const rows = [
    ["Completed lessons", detail.counts.progress],
    ["Attendance marks", detail.counts.attendance],
    ["Assessment attempts", detail.counts.assessments],
    ["Assignment submissions", detail.counts.assignments],
    ["Speaking attempts", detail.counts.speaking],
    ["Listening attempts", detail.counts.listening],
    ["Certificates", detail.counts.certificates],
    ["XP events", detail.counts.xp],
    ["Notifications", detail.counts.notifications],
    ["Active sessions", detail.counts.sessions],
  ];
  return (
    <section className="mb-6 rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold">Account</h2>
      <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Employee code</dt><dd>{detail.user.employeeCode}</dd></div>
        <div><dt className="text-muted">Status</dt><dd>{detail.user.status}</dd></div>
        <div><dt className="text-muted">Department</dt><dd>{detail.user.department?.name ?? "Not assigned"}</dd></div>
        <div><dt className="text-muted">Group</dt><dd>{detail.user.group?.name ?? "Not assigned"}</dd></div>
        <div><dt className="text-muted">Last sign-in</dt><dd>{formatInTimeZone(detail.user.lastLoginAt, detail.user.timezone ?? "Asia/Tehran")}</dd></div>
        <div><dt className="text-muted">Language level</dt><dd>{detail.user.englishLevel ?? "Not assessed yet"}</dd></div>
      </dl>
      <h3 className="mt-4 text-sm font-semibold">Training records</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
        {rows.map(([label, value]) => <li key={String(label)} className="rounded-lg border border-border px-2 py-1">{label}: {value}</li>)}
      </ul>
      <h3 className="mt-4 text-sm font-semibold">Access</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {detail.access.length === 0 ? <li>No extra access grants.</li> : detail.access.slice(0, 12).map((grant, index) => (
          <li key={`${grant.permission}-${index}`}>{grant.permission} · {grant.scopeType}{grant.scopeId ? ` ${grant.scopeId}` : ""} · {grant.source}{grant.endsAt ? ` · until ${formatInTimeZone(grant.endsAt, "Asia/Tehran")}` : ""}</li>
        ))}
      </ul>
      {detail.security ? <p className="mt-3 text-sm">Locked until: {formatInTimeZone(detail.security.lockedUntil, "Asia/Tehran")} · Password change required: {detail.security.mustChangePassword ? "Yes" : "No"}</p> : null}
      <p className="mt-3 text-sm"><Link className="underline" href="/admin/users">Back to users</Link></p>
    </section>
  );
}
