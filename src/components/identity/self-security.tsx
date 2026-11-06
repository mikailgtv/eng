"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function SelfSecurity({ sessions, methods }: { sessions: { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastActivityAt: string }[]; methods: { type: string; enabled: boolean }[] }) {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);

  async function run(url: string, body: Record<string, unknown>) {
    setMessage("");
    try {
      const result = await apiFetch<Record<string, unknown>>(url, { method: "POST", body });
      if (typeof result.secret === "string") setSecret(result.secret);
      if (Array.isArray(result.backupCodes)) setCodes(result.backupCodes.map(String));
      setMessage("Saved.");
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : "Could not complete that action.");
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-2 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run("/api/auth/password", { currentPassword: form.get("currentPassword"), nextPassword: form.get("nextPassword") }); }}>
        <h2 className="text-sm font-semibold">Change password</h2>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        <Label htmlFor="nextPassword">New password</Label>
        <Input id="nextPassword" name="nextPassword" type="password" autoComplete="new-password" required />
        <Button type="submit">Change password</Button>
      </form>
      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Sign-in check</h2>
        <p className="mt-1 text-sm text-muted">Authenticator codes stay on this device. Email codes are delivered in Notifications because no email provider is configured.</p>
        <p className="mt-2 text-sm">Enabled: {methods.filter((item) => item.enabled).map((item) => item.type).join(", ") || "None"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void run("/api/mfa", { action: "totp" })}>Set up authenticator</Button>
          <Button type="button" variant="secondary" onClick={() => void run("/api/mfa", { action: "email" })}>Enable notification code</Button>
        </div>
        {secret ? <p className="mt-3 break-all text-sm">Setup key: {secret}. Enter a code from your app to confirm.</p> : null}
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run("/api/mfa", { action: "confirm", code: form.get("code") }); }}>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" />
          </div>
          <Button type="submit" variant="secondary">Confirm</Button>
        </form>
        {codes.length ? <p className="mt-3 text-sm">Backup codes, shown once: {codes.join(", ")}</p> : null}
      </section>
      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Active sessions</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {sessions.length === 0 ? <li>No active server session was found.</li> : sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{session.userAgent || "Unknown device"} · {session.ipAddress || "Unknown IP"} · last active {new Date(session.lastActivityAt).toISOString()}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => void run("/api/sessions", { sessionId: session.id })}>Log out this session</Button>
            </li>
          ))}
        </ul>
        <Button className="mt-3" type="button" variant="secondary" onClick={() => void run("/api/sessions", { action: "revoke-others" })}>Log out other sessions</Button>
      </section>
      <form className="space-y-2 rounded-xl border border-border p-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run("/api/account/preferences", { preferredLanguage: form.get("preferredLanguage"), timezone: form.get("timezone"), aiAssistance: form.get("aiAssistance") === "on", showTranslations: form.get("showTranslations") === "on" }); }}>
        <h2 className="text-sm font-semibold">Preferences</h2>
        <Label htmlFor="preferredLanguage">Preferred language</Label>
        <Input id="preferredLanguage" name="preferredLanguage" defaultValue="en" />
        <Label htmlFor="timezone">Your timezone</Label>
        <Input id="timezone" name="timezone" defaultValue="Asia/Tehran" />
        <label className="flex items-center gap-2 text-sm"><input name="aiAssistance" type="checkbox" defaultChecked /> Allow the learning assistant</label>
        <label className="flex items-center gap-2 text-sm"><input name="showTranslations" type="checkbox" defaultChecked /> Show translations</label>
        <Button type="submit">Save preferences</Button>
      </form>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
    </div>
  );
}
