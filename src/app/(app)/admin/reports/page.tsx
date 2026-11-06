import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { REPORT_KINDS } from "@/lib/certificates/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requirePageUser(["ADMIN"]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Reports</h1>
      <p className="mt-1 text-sm text-muted">Certificate, completion, hours, attendance, eligibility, expired, and revoked reports are available. Other organization-wide charts are not part of this phase. These files are alphabetical, not a ranking.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {REPORT_KINDS.map((kind) => (
          <li key={kind} className="rounded-xl border border-border px-3 py-2">
            <span className="font-medium">{kind}</span>
            <span className="mt-1 block">
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=pdf`}>PDF</a>
              {" · "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=xlsx`}>XLSX</a>
              {" · "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=csv`}>CSV</a>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm"><Link className="underline" href="/admin/certificates">Certificate settings</Link> · <Link className="underline" href="/admin/content">Content counts</Link> · <Link className="underline" href="/admin/security">User and security counts</Link></p>
    </div>
  );
}
