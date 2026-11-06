import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { listOwnSessions } from "@/lib/ai/service";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Tutor history" };

export default async function TutorHistoryPage() {
  const user = await requirePageUser(["STUDENT"]);
  const sessions = await listOwnSessions(user.id);
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs text-muted"><Link href="/student/tutor" className="underline">English Tutor</Link></p>
      <h1 className="mt-1 text-xl font-semibold">Your practice sessions</h1>
      <p className="mt-1 text-sm text-muted">Only you can see these conversations. They are not grades.</p>
      <ul className="mt-4 space-y-2">
        {sessions.map((session) => (
          <li key={session.id} className="rounded-xl border border-border px-3 py-2 text-sm">
            <span className="font-medium">{label(session.mode)}</span>
            <span className="mt-1 block text-xs text-muted">{formatDateTime(session.startedAt)} · {session.status === "ENDED" ? "Ended" : "Active"} · {session.levelAtTime ?? "Level not stored"}</span>
          </li>
        ))}
        {sessions.length === 0 && <li className="text-sm text-muted">No tutor sessions yet.</li>}
      </ul>
    </div>
  );
}

function label(mode: string) {
  return mode.replaceAll("_", " ").toLowerCase();
}
