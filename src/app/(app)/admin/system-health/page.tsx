import { requirePageUser } from "@/lib/guards";
import { getSystemHealth, type HealthState } from "@/lib/system-health";
import { Card, CardBody } from "@/components/ui/card";

export const dynamic = "force-dynamic";
const tone: Record<HealthState, string> = {
  HEALTHY: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DEGRADED: "border-amber-200 bg-amber-50 text-amber-800",
  DOWN: "border-red-200 bg-red-50 text-red-800",
  NOT_CONFIGURED: "border-slate-200 bg-slate-50 text-slate-700",
};

export default async function SystemHealthPage() {
  await requirePageUser(["ADMIN"]);
  const health = await getSystemHealth();
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">ADMIN · OPERATIONS</p>
      <h1 className="mt-1 text-2xl font-bold">System health</h1>
      <p className="mt-2 text-sm text-muted">Configuration and database probe only. Optional providers are not contacted from this diagnostic page.</p>
      <p className="mt-2 text-xs text-muted">Last checked: <time dateTime={health.checkedAt}>{new Date(health.checkedAt).toLocaleString()}</time> · Overall: <span className="font-bold">{health.status}</span></p>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {health.components.map(component => <Card key={component.name}>
        <CardBody>
          <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{component.name}</h2><span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold tracking-wide ${tone[component.status]}`}>{component.status}</span></div>
          <p className="mt-2 text-sm text-muted">{component.detail}</p>
          {component.latencyMs !== undefined && <p className="mt-2 text-xs text-muted">Probe latency: {component.latencyMs} ms</p>}
        </CardBody>
      </Card>)}
    </div>
    <aside className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Not a full observability monitor.</strong> Error rates, storage health, scheduler heartbeat, provider latency, and historical uptime are not available until durable metrics and health probes are configured.</aside>
  </main>;
}
