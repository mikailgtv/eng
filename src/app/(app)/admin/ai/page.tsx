import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { usageSummary } from "@/lib/ai/service";
import { AdminAiSettings } from "@/components/ai/admin-ai-settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Tutor usage" };

export default async function AdminAiPage() {
  await requirePageUser(["ADMIN"]);
  const [usage, groups] = await Promise.all([
    usageSummary(),
    prisma.learningGroup.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map(groups.map((g) => [g.id, g.name]));
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">English Tutor</h1>
      <p className="mt-1 text-sm text-muted">Organization settings and usage. Provider credentials stay in the server environment and are not shown here. Conversations are not listed.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sessions" value={String(usage.totalSessions)} />
        <Stat label="Messages" value={String(usage.totalMessages)} />
        <Stat label="Active users, 7 days" value={String(usage.activeUsers7d)} />
        <Stat label="Estimated tokens, 7 days" value={String(usage.estimatedTokens7d)} />
      </dl>
      <p className="mt-3 text-xs text-muted">External tutor {usage.providerConfigured ? "is configured in the server environment" : "is not configured. Practice uses course content on this server"}.</p>
      <h2 className="mb-2 mt-6 text-sm font-semibold">Usage by day</h2>
      {usage.byDay.length === 0 ? <p className="text-sm text-muted">No tutor requests in the last 7 days.</p> : (
        <ul className="space-y-1 text-sm">{usage.byDay.map((row) => <li key={row.day}>{row.day}: {row.count} requests</li>)}</ul>
      )}
      <h2 className="mb-2 mt-6 text-sm font-semibold">Usage by group</h2>
      <ul className="space-y-1 text-sm">
        {usage.byGroup.map((row) => <li key={row.groupId}>{names.get(row.groupId) ?? "Group"}: {row.count} requests</li>)}
        {usage.byGroup.length === 0 && <li className="text-muted">No group usage yet.</li>}
      </ul>
      <AdminAiSettings />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
