import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { listOwnVoiceSessions } from "@/lib/voice/service";
import { formatDateTime } from "@/lib/utils";
import { DeleteTranscriptButton } from "@/components/voice/delete-transcript";

export const metadata: Metadata = { title: "Speaking history" };

export default async function SpeakingHistoryPage() {
  const user = await requirePageUser(["STUDENT"]);
  const sessions = await listOwnVoiceSessions(user.id);
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs"><Link className="underline" href="/student/speaking">Speaking</Link></p>
      <h1 className="mt-1 text-xl font-semibold">Speaking history</h1>
      <p className="mt-1 text-sm text-muted">Counts only. No pronunciation score. Recordings are not stored.</p>
      <ul className="mt-4 space-y-2">
        {sessions.map((session) => (
          <li key={session.id} className="rounded-xl border border-border px-3 py-2 text-sm">
            <p className="font-medium">{session.topic}</p>
            <p className="text-xs text-muted">{formatDateTime(session.startedAt)} · {session.kind} · {session.levelAtTime ?? "Level not stored"} · {session.turns} turns · {session.recognizedCount} understood · {session.status}</p>
            <DeleteTranscriptButton id={session.id} />
          </li>
        ))}
        {sessions.length === 0 && <li className="text-sm text-muted">No speaking sessions yet.</li>}
      </ul>
    </div>
  );
}
