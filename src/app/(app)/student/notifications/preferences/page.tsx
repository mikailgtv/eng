import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { preferenceView } from "@/lib/communication/hub";
import { channelStatus } from "@/lib/communication/providers";
import { PreferenceForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notification preferences" };

export default async function PreferencesPage() {
  const user = await requirePageUser(["STUDENT", "TEACHER", "ADMIN"]);
  const view = await preferenceView(user.id);
  const channels = channelStatus();
  const back = user.role === "ADMIN" ? "/admin/notifications" : user.role === "TEACHER" ? "/teacher/notifications" : "/student/notifications";
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-sm"><Link className="underline" href={back}>Notifications</Link></p>
      <h1 className="mt-1 text-2xl font-semibold">Preferences</h1>
      <p className="mt-1 text-sm text-muted">Times use {view.timezone}. Email: {channels.email.detail} Push: {channels.push.detail} SMS: {channels.sms.detail}</p>
      <div className="mt-4">
        <PreferenceForm initial={view.categories} quietStart={view.quietStart} quietEnd={view.quietEnd} />
      </div>
    </div>
  );
}
