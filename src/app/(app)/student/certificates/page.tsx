import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { studentCertificateHome } from "@/lib/certificates/service";
import { PreferenceForm, PreviewButton } from "@/components/certificates/forms";
import { STATUS_DEFINITIONS } from "@/lib/certificates/rules";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificates" };

export default async function StudentCertificatesPage() {
  const user = await requirePageUser(["STUDENT"]);
  const home = await studentCertificateHome(user.id);
  return (
    <div className="mx-auto w-full max-w-lg px-1">
      <h1 className="text-2xl font-semibold">Certificates</h1>
      <p className="mt-1 text-sm text-muted">{home.note}</p>
      <p className="mt-2 text-sm"><Link className="underline" href="/student/training-record">Official training record</Link></p>
      {home.courses.length === 0 && <p className="mt-4 rounded-xl border border-border p-4 text-sm">No course is assigned to your group yet. There is no certificate to show.</p>}
      <div className="mt-4 space-y-4">
        {home.courses.map((course) => (
          <section key={course.courseId} className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">{course.courseTitle}</h2>
            <p className="mt-1 text-sm">Status: {course.status.replaceAll("_", " ")}</p>
            <p className="text-sm text-muted">{course.statusDefinition}</p>
            <h3 className="mt-3 text-sm font-semibold">What is still needed</h3>
            <ul className="mt-2 space-y-2">
              {course.requirements.filter((item) => item.status !== "NOT_REQUIRED").map((item) => (
                <li key={item.key} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{item.status === "MET" || item.status === "OVERRIDDEN" ? "Done" : "Still needed"}: {item.requirement}</p>
                  <p>{item.evidence}</p>
                  {item.missingAction && <p>Next: {item.missingAction}</p>}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <PreviewButton courseId={course.courseId} />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Issued certificates</h3>
            {course.certificates.length === 0 && <p className="mt-1 text-sm text-muted">No certificate yet.</p>}
            <ul className="mt-2 space-y-2">
              {course.certificates.map((certificate) => (
                <li key={certificate.publicId} className="text-sm">
                  <p>{certificate.publicId} · {certificate.status} · {certificate.issuedAt}</p>
                  {certificate.downloadPath && <a className="underline" href={certificate.downloadPath}>Download PDF</a>}
                  <p className="text-xs text-muted">Check: /verify/certificate/{certificate.publicId}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="mt-2"><PreferenceForm initial={home.preference} /></div>
      </section>
      <details className="mt-6 text-sm">
        <summary>What the statuses mean</summary>
        <ul className="mt-2 space-y-1">
          {Object.entries(STATUS_DEFINITIONS).map(([status, definition]) => <li key={status}><span className="font-medium">{status.replaceAll("_", " ")}:</span> {definition}</li>)}
        </ul>
      </details>
    </div>
  );
}
