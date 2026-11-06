import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { adaptiveUsage } from "@/lib/adaptive/service";
import { AdminAdaptiveSettings } from "@/components/adaptive/admin-adaptive-settings";

export const metadata: Metadata = { title: "Adaptive learning" };

export default async function AdminLearningPage() {
  await requirePageUser(["ADMIN"]);
  const usage = await adaptiveUsage();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Adaptive learning</h1>
      <p className="mt-1 text-sm text-muted">Counts only. No student ranking. Review timing is a configurable estimate, not a scientific measurement.</p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Events, 7 days" value={usage.events7d} />
        <Stat label="Plans, 7 days" value={usage.plans7d} />
        <Stat label="Open recommendations" value={usage.openRecommendations} />
      </dl>
      <AdminAdaptiveSettings />
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
