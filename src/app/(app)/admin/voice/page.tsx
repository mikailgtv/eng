import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { voiceUsage } from "@/lib/voice/service";
import { sttConfig, ttsConfig } from "@/lib/voice/providers";
import { AdminVoiceSettings } from "@/components/voice/admin-voice-settings";

export const metadata: Metadata = { title: "Speaking and listening" };

export default async function AdminVoicePage() {
  await requirePageUser(["ADMIN"]);
  const usage = await voiceUsage();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Speaking and listening</h1>
      <p className="mt-1 text-sm text-muted">Usage counts. No rankings. Provider credentials are not shown. Raw audio storage stays off.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Sessions" value={usage.totalSessions} />
        <Stat label="Speech checks, 7 days" value={usage.sttRequests7d} />
        <Stat label="Speech errors, 7 days" value={usage.sttErrors7d} />
        <Stat label="Speak requests, 7 days" value={usage.ttsRequests7d} />
        <Stat label="Active learners, 7 days" value={usage.activeLearners7d} />
      </dl>
      <p className="mt-3 text-xs text-muted">
        External speech recognition {sttConfig().externalConfigured ? "is configured in the server environment" : "is not configured. The browser microphone or typing is used"}.
        External spoken audio {ttsConfig().externalConfigured ? "is configured" : "is not configured. The browser speaks the sentence, or the student reads it"}.
      </p>
      <AdminVoiceSettings />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
