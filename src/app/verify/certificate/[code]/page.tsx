import type { Metadata } from "next";
import Link from "next/link";
import { publicVerification } from "@/lib/certificates/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificate check" };

const STATUS_TEXT: Record<string, string> = {
  VALID: "Valid. This certificate ID matches an issued record.",
  REVOKED: "Revoked. This certificate is not valid. The record is kept.",
  EXPIRED: "Expired. This certificate is past its expiration date. The record is kept.",
  NOT_FOUND: "Not found. No certificate matches that ID.",
  SUPERSEDED: "Not valid. This certificate was replaced by a newer record.",
  NOT_VALID: "Not valid. This record failed an integrity check and is not shown as valid.",
};

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await publicVerification(code);
  const status = "status" in result ? result.status : "NOT_FOUND";
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-8">
      <p className="text-sm text-muted">EnglishBridge</p>
      <h1 className="mt-1 text-2xl font-semibold">Certificate check</h1>
      <p className="mt-2 text-sm">This page shows only the certificate status. It does not show an employee code, email, private notes, or grades unless an administrator explicitly allowed a score.</p>
      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">Status: {status}</h2>
        <p className="mt-1 text-sm">{STATUS_TEXT[status] ?? "Not found. No certificate matches that ID."}</p>
        {"certificateId" in result && result.certificateId && (
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-muted">Certificate ID</dt><dd>{result.certificateId}</dd></div>
            {"studentName" in result && <div><dt className="text-muted">Name</dt><dd>{result.studentName}</dd></div>}
            {"courseTitle" in result && <div><dt className="text-muted">Course</dt><dd>{result.courseTitle}</dd></div>}
            {"issuedAt" in result && <div><dt className="text-muted">Issued</dt><dd>{result.issuedAt}</dd></div>}
            {"expiresAt" in result && <div><dt className="text-muted">Expires</dt><dd>{result.expiresAt ?? "No expiration date"}</dd></div>}
            {"officialScore" in result && result.officialScore && <div><dt className="text-muted">Official exam result</dt><dd>{result.officialScore}</dd></div>}
            {"replacementNote" in result && result.replacementNote && <div><dt className="text-muted">Replacement</dt><dd>{result.replacementNote}</dd></div>}
          </dl>
        )}
      </section>
      <p className="mt-4 text-sm"><Link className="underline" href="/login">Sign in</Link></p>
    </main>
  );
}
