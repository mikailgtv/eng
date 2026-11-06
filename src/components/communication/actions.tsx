"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function MessageSearch() {
  const [results, setResults] = useState<{ id: string; sender: string; body: string; createdAt: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="mt-3 space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const params = new URLSearchParams();
      for (const key of ["q", "from", "to", "date", "category"]) {
        const value = String(data.get(key) ?? "").trim();
        if (value) params.set(key, value);
      }
      try {
        const found = await apiFetch<{ id: string; sender: string; body: string; createdAt: string }[]>(`/api/messages/search?${params.toString()}`);
        setResults(found);
        setMessage(found.length ? `${found.length} result${found.length === 1 ? "" : "s"}.` : "No matching message.");
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Search failed.");
      }
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">Keyword<input name="q" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
        <label className="text-sm">From<input name="from" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
        <label className="text-sm">To<input name="to" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
        <label className="text-sm">Date<input name="date" type="date" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
      </div>
      <label className="block text-sm">Category
        <select name="category" className="mt-1 h-11 w-full rounded-lg border border-border px-2">
          <option value="">Any</option>
          <option value="MESSAGE">Message</option>
        </select>
      </label>
      <Button type="submit" variant="secondary" className="h-11">Search</Button>
      {message && <p className="text-sm" role="status">{message}</p>}
      <ul className="space-y-1 text-sm">{results.map((item) => <li key={item.id}>{item.sender}: {item.body} <span className="text-muted">{item.createdAt}</span></li>)}</ul>
    </form>
  );
}

export function NoticeActions({ id, acknowledge }: { id: string; acknowledge?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  async function run(body: Record<string, unknown>) {
    try {
      await apiFetch("/api/communication/read", { method: "POST", body });
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : "Could not update the notice.");
    }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" variant="secondary" className="h-11" onClick={() => run({ id })}>Mark as read</Button>
      <Button type="button" variant="secondary" className="h-11" onClick={() => run({ id, archive: true })}>Archive</Button>
      {acknowledge && <Button type="button" className="h-11" onClick={() => run({ id, acknowledge: true })}>Mark as acknowledged</Button>}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}

export function MarkAllRead() {
  const router = useRouter();
  return <Button type="button" variant="secondary" className="h-11" onClick={() => apiFetch("/api/communication/read", { method: "POST", body: { all: true } }).then(() => router.refresh())}>Mark all as read</Button>;
}

export function MessageForm({ contacts, groups = [] }: { contacts: { id: string; name: string }[]; groups?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [recipientId, setRecipientId] = useState(contacts[0]?.id ?? "");
  const [groupId, setGroupId] = useState("");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      setMessage(null);
      try {
        await apiFetch("/api/messages", { method: "POST", body: groupId ? { groupId, body, confirm } : { recipientId, body } });
        setBody("");
        setMessage(groupId ? "Group messages were sent as separate conversations." : "Message sent.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "The message was not sent.");
      }
    }}>
      <label className="block text-sm">To
        <select className="mt-1 h-11 w-full rounded-lg border border-border px-2" value={recipientId} onChange={(event) => { setRecipientId(event.target.value); setGroupId(""); }}>
          {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
        </select>
      </label>
      {groups.length > 0 && (
        <label className="block text-sm">Or a whole group
          <select className="mt-1 h-11 w-full rounded-lg border border-border px-2" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">One person</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm">Message
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border p-2" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      {groupId && <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />I confirm this group message</label>}
      <Button type="submit" className="h-11">Send</Button>
      {message && <p className="text-sm" role="status">{message}</p>}
    </form>
  );
}

export function ReplyForm({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="mt-3 space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      try {
        await apiFetch("/api/messages", { method: "POST", body: { recipientId, body } });
        setBody("");
        setMessage("Reply sent.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Could not send.");
      }
    }}>
      <label className="block text-sm">Reply
        <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border p-2" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <Button type="submit" className="h-11">Send reply</Button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}

export function PreferenceForm({ initial, quietStart, quietEnd }: { initial: { category: string; inApp: boolean; email: boolean; push: boolean; sms: boolean; criticalNote: string | null }[]; quietStart: string; quietEnd: string }) {
  const router = useRouter();
  const [start, setStart] = useState(quietStart);
  const [end, setEnd] = useState(quietEnd);
  const [state, setState] = useState<{ saving: boolean; message: string | null; error: boolean }>({ saving: false, message: null, error: false });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Quiet hours apply to email, push, and SMS. In-app notices are still stored. Official exam, certificate, and admin notices stay in the app.</p>

      {/* Quiet hours are stored separately from the categories below, so they get
          their own form and their own save button — and saving a category can
          never overwrite them. */}
      <form
        className="rounded-xl border border-border p-3 text-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setState({ saving: true, message: null, error: false });
          try {
            await apiFetch("/api/communication/preferences", { method: "POST", body: { quietStart: start, quietEnd: end } });
            setState({ saving: false, message: "Quiet hours saved.", error: false });
            router.refresh();
          } catch (err) {
            setState({ saving: false, message: err instanceof ApiClientError ? err.message : "Could not save quiet hours.", error: true });
          }
        }}
      >
        <p className="font-medium">Quiet hours</p>
        <p className="text-xs text-muted">Saved on their own — use this button when you change these times.</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="block text-sm">Quiet hours start
            <input className="mt-1 block h-11 w-32 rounded-lg border border-border px-2" value={start || ""} placeholder="22:00" onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="block text-sm">Quiet hours end
            <input className="mt-1 block h-11 w-32 rounded-lg border border-border px-2" value={end || ""} placeholder="07:00" onChange={(event) => setEnd(event.target.value)} />
          </label>
          <Button type="submit" className="h-11" variant="secondary" loading={state.saving}>
            {state.saving ? "Saving…" : "Save quiet hours"}
          </Button>
        </div>
        {state.message && (
          <p role="status" className={state.error ? "mt-2 text-sm text-danger" : "mt-2 text-sm text-emerald-700"}>{state.message}</p>
        )}
      </form>

      {initial.map((item) => (
        <PreferenceCategoryForm key={item.category} item={item} />
      ))}
    </div>
  );
}

/** One notification category. Feedback renders next to the button that saved it. */
function PreferenceCategoryForm({ item }: { item: { category: string; inApp: boolean; email: boolean; push: boolean; sms: boolean; criticalNote: string | null } }) {
  const router = useRouter();
  const label = item.category.replaceAll("_", " ");
  const [state, setState] = useState<{ saving: boolean; message: string | null; error: boolean }>({ saving: false, message: null, error: false });

  return (
    <form
      className="rounded-xl border border-border p-3 text-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setState({ saving: true, message: null, error: false });
        try {
          // Only this category's channels are sent; quiet hours have their own save.
          await apiFetch("/api/communication/preferences", {
            method: "POST",
            body: {
              category: item.category,
              inApp: data.get("inApp") === "on",
              email: data.get("email") === "on",
              push: data.get("push") === "on",
              sms: data.get("sms") === "on",
            },
          });
          setState({ saving: false, message: `${label} saved.`, error: false });
          router.refresh();
        } catch (err) {
          setState({ saving: false, message: err instanceof ApiClientError ? err.message : "Could not save.", error: true });
        }
      }}
    >
      <p className="font-medium">{label}</p>
      {item.criticalNote && <p className="text-xs text-muted">{item.criticalNote}</p>}
      <label className="mt-2 flex gap-2"><input type="checkbox" name="inApp" defaultChecked={item.inApp} />In-app</label>
      <label className="flex gap-2"><input type="checkbox" name="email" defaultChecked={item.email} />Email, if a provider is configured</label>
      <label className="flex gap-2"><input type="checkbox" name="push" defaultChecked={item.push} />Push, if a provider is configured</label>
      <label className="flex gap-2"><input type="checkbox" name="sms" defaultChecked={item.sms} />SMS, urgent only and only if enabled</label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-11" variant="secondary" loading={state.saving}>
          {state.saving ? "Saving…" : `Save ${label}`}
        </Button>
        {state.message && (
          <span role="status" className={state.error ? "text-sm text-danger" : "text-sm text-emerald-700"}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function AnnouncementForm({ groups, courses = [], students = [], allowAll = false }: { groups: { id: string; name: string }[]; courses?: { id: string; name: string }[]; students?: { id: string; name: string }[]; allowAll?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [targetType, setTargetType] = useState("GROUP");
  const targetOptions = targetType === "COURSE" ? courses : targetType === "USER" ? students : groups;
  return (
    <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        await apiFetch("/api/communication/announcements", {
          method: "POST",
          body: {
            title: data.get("title"),
            body: data.get("body"),
            announcementType: data.get("announcementType"),
            priority: data.get("priority"),
            publishAt: new Date(String(data.get("publishAt"))).toISOString(),
            expireAt: data.get("expireAt") ? new Date(String(data.get("expireAt"))).toISOString() : null,
            confirm: data.get("confirm") === "on",
            acknowledgementRequired: data.get("ack") === "on",
            targets: [{ targetType: data.get("targetType"), targetId: data.get("targetId") || null }],
          },
        });
        setMessage("Announcement saved.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "The announcement was not saved.");
      }
    }}>
      <label className="block text-sm">Title<input name="title" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
      <label className="block text-sm">Message<textarea name="body" className="mt-1 min-h-24 w-full rounded-lg border border-border p-2" /></label>
      <label className="block text-sm">Type
        <select name="announcementType" className="mt-1 h-11 w-full rounded-lg border border-border px-2">
          <option value="INFORMATION">Information</option>
          <option value="REMINDER">Reminder</option>
          <option value="SCHEDULE_CHANGE">Schedule change</option>
          <option value="COURSE_UPDATE">Course update</option>
          <option value="EXAM_NOTICE">Exam notice</option>
          <option value="TRAINING">Training announcement</option>
          <option value="SYSTEM_MAINTENANCE">System maintenance</option>
        </select>
      </label>
      <label className="block text-sm">Priority
        <select name="priority" className="mt-1 h-11 w-full rounded-lg border border-border px-2">
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent, administrators only</option>
        </select>
      </label>
      <label className="block text-sm">Publish<input name="publishAt" type="datetime-local" className="mt-1 h-11 w-full rounded-lg border border-border px-2" required /></label>
      <label className="block text-sm">Expire<input name="expireAt" type="datetime-local" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
      <label className="block text-sm">Audience
        <select name="targetType" className="mt-1 h-11 w-full rounded-lg border border-border px-2" value={targetType} onChange={(event) => setTargetType(event.target.value)}>
          <option value="GROUP">One group</option>
          <option value="SHIFT">One shift</option>
          {courses.length > 0 && <option value="COURSE">One course</option>}
          {students.length > 0 && <option value="USER">One student</option>}
          {allowAll && <option value="ALL">All students and teachers</option>}
        </select>
      </label>
      {targetType !== "ALL" && (
        <label className="block text-sm">Who
          <select name="targetId" className="mt-1 h-11 w-full rounded-lg border border-border px-2">
            {targetOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}
      <label className="flex gap-2 text-sm"><input type="checkbox" name="ack" />Require acknowledgement</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="confirm" required />I confirm this announcement</label>
      <Button type="submit" className="h-11">Save announcement</Button>
      {message && <p className="text-sm" role="status">{message}</p>}
    </form>
  );
}

export function TemplateForm() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="space-y-2 text-sm" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const payload = { key: data.get("key"), name: data.get("name"), category: data.get("category"), subject: data.get("subject"), body: data.get("body"), active: data.get("active") === "on", confirm: data.get("confirm") === "on", preview: data.get("preview") === "on" };
      try {
        const result = await apiFetch<{ preview?: string; version?: number }>("/api/communication/templates", { method: "POST", body: payload });
        setMessage(result.preview ? `Preview: ${result.preview}` : `Saved as version ${result.version}.`);
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "The template was not saved.");
      }
    }}>
      <label className="block">Key<input name="key" className="mt-1 h-11 w-full rounded-lg border border-border px-2" placeholder="assignment.due" /></label>
      <label className="block">Name<input name="name" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
      <label className="block">Category
        <select name="category" className="mt-1 h-11 w-full rounded-lg border border-border px-2"><option>ASSIGNMENT</option><option>EXAM</option><option>SCHEDULE</option><option>ADMIN</option></select>
      </label>
      <label className="block">Subject<input name="subject" className="mt-1 h-11 w-full rounded-lg border border-border px-2" /></label>
      <label className="block">Body<textarea name="body" className="mt-1 min-h-20 w-full rounded-lg border border-border p-2" placeholder="Hello {{student_name}}" /></label>
      <label className="flex gap-2"><input type="checkbox" name="active" />Active</label>
      <label className="flex gap-2"><input type="checkbox" name="preview" />Preview only</label>
      <label className="flex gap-2"><input type="checkbox" name="confirm" />I confirm this template</label>
      <Button type="submit" className="h-11">Save or preview</Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

export function SettingToggle({ settingKey, label, enabled }: { settingKey: string; label: string; enabled: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="mt-2 flex flex-wrap items-center gap-2 text-sm" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        await apiFetch("/api/communication/settings", { method: "POST", body: { key: settingKey, value: data.get("value"), confirm: data.get("confirm") === "on" } });
        setMessage("Saved.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Not saved.");
      }
    }}>
      <span>{label}: {enabled ? "On" : "Off"}</span>
      <select name="value" className="h-11 rounded-lg border border-border px-2" defaultValue={enabled ? "true" : "false"}>
        <option value="false">Off</option>
        <option value="true">On</option>
      </select>
      <label className="flex gap-2"><input type="checkbox" name="confirm" />Confirm</label>
      <Button type="submit" variant="secondary" className="h-11">Save</Button>
      {message && <span>{message}</span>}
    </form>
  );
}

export function AcknowledgeButton({ id }: { id: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <Button type="button" className="h-11" onClick={async () => {
        try {
          await apiFetch("/api/communication/announcements/acknowledge", { method: "POST", body: { id, confirm: true } });
          setMessage("Acknowledged. This is separate from opening the notice.");
          router.refresh();
        } catch (err) {
          setMessage(err instanceof ApiClientError ? err.message : "Could not acknowledge.");
        }
      }}>Mark as acknowledged</Button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
