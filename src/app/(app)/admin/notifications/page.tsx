import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { communicationAnalytics, listNotifications } from "@/lib/communication/hub";
import { channelStatus } from "@/lib/communication/providers";
import { communicationSettings } from "@/lib/communication/settings";
import { prisma } from "@/lib/prisma";
import { MarkAllRead, SettingToggle, TemplateForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requirePageUser(["ADMIN"]);
  const [analytics, channels, settings, rules, templates, notices] = await Promise.all([
    communicationAnalytics(),
    Promise.resolve(channelStatus()),
    communicationSettings(),
    prisma.notificationRule.findMany({ orderBy: { eventKey: "asc" } }),
    prisma.notificationTemplate.findMany({ orderBy: { name: "asc" }, take: 10 }),
    listNotifications((await requirePageUser(["ADMIN"])).id, { take: 8 }),
  ]);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-xl font-semibold">Communication hub</h1>
      <p className="mt-1 text-sm text-muted">In-app notices are primary. Email, push, and SMS are optional and are not described as delivered unless a provider confirms that.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="In-app stored" value={analytics.stored} />
        <Stat label="Read" value={analytics.read} />
        <Stat label="Provider accepted" value={analytics.submitted} />
        <Stat label="Failed" value={analytics.failed} />
        <Stat label="Acknowledged" value={analytics.acknowledged} />
      </dl>
      <p className="mt-2 text-xs text-muted">{analytics.note}</p>
      <section className="mt-4 text-sm">
        <h2 className="font-semibold">Channels</h2>
        <ul className="mt-2 space-y-1">
          <li>In-app: {channels.inApp.detail}</li>
          <li>Email: {channels.email.detail}</li>
          <li>Push: {channels.push.detail}</li>
          <li>SMS: {channels.sms.detail} Admin switch is {settings.smsEnabled ? "on" : "off"}.</li>
        </ul>
        <p className="mt-2">Student-to-student messages: {settings.studentToStudent ? "on" : "off"}. Read receipts: {settings.readReceipts ? "on" : "off"}.</p>
        <SettingToggle settingKey="studentToStudent" label="Student-to-student messages" enabled={settings.studentToStudent} />
        <SettingToggle settingKey="readReceipts" label="Read receipts" enabled={settings.readReceipts} />
      </section>
      <section className="mt-4">
        <h2 className="text-sm font-semibold">Rules</h2>
        {rules.length === 0 && <p className="mt-1 text-sm text-muted">Rules are created the first time reminders run. AI notices stay off until enabled.</p>}
        <ul className="mt-2 space-y-1 text-sm">
          {rules.map((rule) => <li key={rule.id}>{rule.eventKey}: {rule.enabled ? "On" : "Off"} · {rule.category} · {rule.priority}</li>)}
        </ul>
      </section>
      <section className="mt-4 text-sm">
        <h2 className="font-semibold">Templates</h2>
        {templates.length === 0 && <p className="mt-1 text-muted">No template yet. Save one from the communication API before activating it.</p>}
        <ul className="mt-2 space-y-1">{templates.map((template) => <li key={template.id}>{template.name} · version {template.version} · {template.active ? "Active" : "Inactive"}</li>)}</ul>
        <div className="mt-3 max-w-lg"><TemplateForm /></div>
      </section>
      <p className="mt-4 text-sm"><Link className="underline" href="/admin/announcements">Announcements</Link> · <Link className="underline" href="/student/notifications/preferences">Preferences</Link></p>
      <div className="mt-3"><MarkAllRead /></div>
      <ul className="mt-3 space-y-2 text-sm">
        {notices.items.map((item) => <li key={item.id}>{item.state}: {item.title} · {item.displayTime}</li>)}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border px-3 py-2"><dt className="text-xs text-muted">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value}</dd></div>;
}
