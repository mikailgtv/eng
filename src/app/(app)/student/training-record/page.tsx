import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { trainingRecord } from "@/lib/certificates/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Training record" };

export default async function TrainingRecordPage() {
  const user = await requirePageUser(["STUDENT"]);
  const record = await trainingRecord(user, user.id);
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs"><Link className="underline" href="/student/certificates">Certificates</Link></p>
      <h1 className="mt-1 text-2xl font-semibold">Training record</h1>
      <p className="mt-1 text-sm text-muted">{record.note}</p>
      <p className="mt-3 text-sm"><a className="underline" href="/api/certificates/transcript">Download PDF</a></p>
      {record.entries.length === 0 && <p className="mt-4 text-sm">No official course record yet.</p>}
      <div className="mt-4 space-y-3">
        {record.entries.map((entry) => (
          <section key={entry.courseCode} className="rounded-2xl border border-border p-4 text-sm">
            <h2 className="font-semibold">{entry.courseTitle}</h2>
            <p>Status: {entry.status.replaceAll("_", " ")}. {entry.statusDefinition}</p>
            <p>Started: {entry.startedAt ?? "No official start is recorded."}</p>
            <p>Completion recorded: {entry.completionRecordedAt ?? "Not recorded."}</p>
            <p>{entry.attendance.note}</p>
            <p>{entry.hours.plannedNote}</p>
            <p>{entry.hours.recordedNote}</p>
            <p>Certificates: {entry.certificateIds.length ? entry.certificateIds.map((item) => `${item.id} (${item.status})`).join(", ") : "None"}</p>
            {entry.officialScore && <p>Official exam result: {entry.officialScore}</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
