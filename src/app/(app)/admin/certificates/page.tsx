import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { adminDesk } from "@/lib/certificates/service";
import { AdminCertificateForms, TemplateForms } from "@/components/certificates/forms";
import { REPORT_KINDS } from "@/lib/certificates/reports";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificates" };

export default async function AdminCertificatesPage() {
  await requirePageUser(["ADMIN"]);
  const desk = await adminDesk();
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-xl font-semibold">Certificates and training records</h1>
      <p className="mt-1 text-sm text-muted">Official completion only. Practice, XP, badges, streaks, and AI tutor activity are not evidence. Automatic issuance is {desk.settings.autoIssue ? "on" : "off"}.</p>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">What the statuses mean</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {Object.entries(desk.definitions).map(([status, definition]) => <li key={status}><span className="font-medium">{status.replaceAll("_", " ")}:</span> {definition}</li>)}
        </ul>
      </section>
      <div className="mt-6"><TemplateForms /></div>
      <div className="mt-6">
        <AdminCertificateForms courses={desk.courses} students={desk.students} groups={desk.groups} certificates={desk.certificates} />
      </div>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Recent certificates</h2>
        {desk.certificates.length === 0 && <p className="mt-2 text-sm text-muted">No certificate has been issued.</p>}
        <ul className="mt-2 space-y-2 md:hidden">
          {desk.certificates.map((certificate) => (
            <li key={certificate.publicId} className="rounded-xl border border-border p-3 text-sm">
              <p className="font-medium">{certificate.publicId}</p>
              <p>{certificate.studentName} · {certificate.courseTitle}</p>
              <p>{certificate.status}{certificate.automatic ? " · automatic" : ""} · {certificate.issuedAt}</p>
            </li>
          ))}
        </ul>
        <div className="table-scroll mt-2 hidden md:block">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Issued certificates in recent order, not a ranking</caption>
            <thead><tr className="border-b border-border"><th className="py-2 pr-3">Certificate ID</th><th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Status</th><th className="py-2">Issued</th></tr></thead>
            <tbody>
              {desk.certificates.map((certificate) => (
                <tr key={certificate.publicId} className="border-b border-border">
                  <td className="py-2 pr-3">{certificate.publicId}</td>
                  <td className="py-2 pr-3">{certificate.studentName}</td>
                  <td className="py-2 pr-3">{certificate.courseTitle}</td>
                  <td className="py-2 pr-3">{certificate.status}{certificate.automatic ? " · automatic" : ""}</td>
                  <td className="py-2">{certificate.issuedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted">On a phone each certificate is a card. The list is not a ranking.</p>
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Reports</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {REPORT_KINDS.map((kind) => (
            <li key={kind}>
              <span className="font-medium">{kind}</span>{" "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=pdf`}>PDF</a>{" · "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=xlsx`}>XLSX</a>{" · "}
              <a className="underline" href={`/api/certificates/reports?kind=${kind}&format=csv`}>CSV</a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm"><Link className="underline" href="/admin/reports">Report page</Link></p>
      </section>
    </div>
  );
}
