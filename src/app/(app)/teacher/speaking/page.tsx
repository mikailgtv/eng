import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { groupsForViewer } from "@/lib/teaching/queries";
import { teacherVoiceSummary } from "@/lib/voice/service";
import { SPEAKING_TOPICS } from "@/lib/voice/topics";
import { VoiceAssignForm } from "@/components/voice/voice-assign-form";

export const metadata: Metadata = { title: "Speaking" };

export default async function TeacherSpeakingPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const [groups, summary] = await Promise.all([groupsForViewer(viewer), teacherVoiceSummary(viewer)]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Speaking</h1>
      <p className="mt-1 text-sm text-muted">
        {summary.speechAttempts} recognized turns in your groups. {summary.listeningAttempts} listening checks.
        Transcripts are {summary.transcriptsVisible ? "visible because an administrator turned that on" : "hidden. You see counts, not private conversations"}.
        Recordings are not stored.
      </p>
      <VoiceAssignForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} topics={SPEAKING_TOPICS.map((t) => ({ id: t.id, title: t.title }))} />
      <ul className="mt-4 space-y-2">
        {summary.sessions.map((session) => (
          <li key={session.id} className="rounded-xl border border-border px-3 py-2 text-sm">
            {session.topic} · {session.kind} · {session.turns} turns · {session.recognizedCount} understood · {session.status}
          </li>
        ))}
        {summary.sessions.length === 0 && <li className="text-sm text-muted">No speaking sessions in your groups yet.</li>}
      </ul>
    </div>
  );
}
