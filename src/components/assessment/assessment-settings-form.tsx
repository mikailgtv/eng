"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

export interface AssessmentSettings {
  id?: string;
  title: string;
  description: string;
  type: string;
  courseId: string;
  durationMinutes: string; // "" = untimed
  passingScore: number;
  maxAttempts: string; // "" = unlimited
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  allowNavigation: boolean;
  status: string;
  startAt: string; // datetime-local value
  endAt: string;
}

export interface ScopeOptions {
  courses: { id: string; title: string }[];
}

/** datetime-local has no zone. The organization clock is UTC, so the value the teacher types is UTC wall time — never the browser's local zone. */
function toUtcInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

function fromUtcInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}:00Z`).toISOString();
}

/**
 * Create/edit form for assessment settings. Every control is real: changes
 * persist through the API; publishing requires ≥1 question (server-checked).
 */
export function AssessmentSettingsForm({
  initial,
  scope,
  mode,
}: {
  initial: AssessmentSettings;
  scope: ScopeOptions;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<string | null>(null);

  function set<K extends keyof AssessmentSettings>(key: K, value: AssessmentSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function payload() {
    return {
      title: form.title,
      description: form.description.trim() ? form.description.trim() : undefined,
      type: form.type,
      courseId: form.courseId || undefined,
      durationMinutes: form.durationMinutes === "" ? null : Number(form.durationMinutes),
      passingScore: form.passingScore,
      maxAttempts: form.maxAttempts === "" ? null : Number(form.maxAttempts),
      randomizeQuestions: form.randomizeQuestions,
      randomizeOptions: form.randomizeOptions,
      showResults: form.showResults,
      showCorrectAnswers: form.showCorrectAnswers,
      allowNavigation: form.allowNavigation,
      status: form.status,
      startAt: fromUtcInput(form.startAt),
      endAt: fromUtcInput(form.endAt),
    };
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        const created = await apiFetch<{ id: string }>("/api/assessments", { method: "POST", body: payload() });
        notify("success", "Assessment created — now add questions.");
        router.push(`/teacher/exams/${created.id}`);
      } else {
        await apiFetch(`/api/assessments/${initial.id}`, { method: "PATCH", body: payload() });
        notify("success", "Settings saved.");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save the assessment.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/assessments/${initial.id}`, { method: "PATCH", body: { status } });
      set("status", status);
      notify("success", statusLabel(status) + ".");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not change the status.");
    } finally {
      setBusy(false);
      setStatusTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor="a-title">
          <Input id="a-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Verb to be — Lesson Quiz" />
        </FormField>
        <FormField label="Assessment type" htmlFor="a-type" hint="practice lives in lessons, not here">
          <Select id="a-type" value={form.type} onChange={(e) => set("type", e.target.value)} disabled={mode === "edit"}>
            <option value="QUIZ">Quiz — short assessment</option>
            <option value="EXAM">Exam — formal assessment</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Description" htmlFor="a-desc">
        <Textarea id="a-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this assessment covers…" />
      </FormField>

      <FormField label="Course" htmlFor="a-course" hint="students see it through their group's course assignment">
        <Select id="a-course" value={form.courseId} onChange={(e) => set("courseId", e.target.value)}>
          <option value="">— choose a course —</option>
          {scope.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormField label="Duration (min)" htmlFor="a-dur" hint="empty = no limit">
          <Input id="a-dur" type="number" min={1} max={300} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
        </FormField>
        <FormField label="Passing score %" htmlFor="a-pass">
          <Input id="a-pass" type="number" min={1} max={100} value={form.passingScore} onChange={(e) => set("passingScore", Math.max(1, Math.min(100, Number(e.target.value) || 70)))} />
        </FormField>
        <FormField label="Attempts" htmlFor="a-att" hint="empty = unlimited">
          <Input id="a-att" type="number" min={1} max={20} value={form.maxAttempts} onChange={(e) => set("maxAttempts", e.target.value)} />
        </FormField>
        <FormField label="Status" htmlFor="a-status">
          <Select id="a-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "ARCHIVED"].map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Opens at (UTC)" htmlFor="a-start" hint="students can start from this time">
          <Input id="a-start" type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} />
        </FormField>
        <FormField label="Closes at (UTC)" htmlFor="a-end">
          <Input id="a-end" type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} />
        </FormField>
      </div>

      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-1 text-[13px] font-semibold text-foreground">Student experience</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Randomize question order" checked={form.randomizeQuestions} onChange={(v) => set("randomizeQuestions", v)} />
          <Toggle label="Randomize option order" checked={form.randomizeOptions} onChange={(v) => set("randomizeOptions", v)} />
          <Toggle label="Show results after submission" checked={form.showResults} onChange={(v) => set("showResults", v)} />
          <Toggle label="Show correct answers in review" checked={form.showCorrectAnswers} onChange={(v) => set("showCorrectAnswers", v)} />
          <Toggle label="Allow jumping between questions" checked={form.allowNavigation} onChange={(v) => set("allowNavigation", v)} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} loading={busy}>
          {mode === "create" ? "Create assessment" : "Save settings"}
        </Button>
        {mode === "edit" && form.status !== "OPEN" && form.status !== "ARCHIVED" && (
          <Button variant="subtle" onClick={() => setStatusTarget("OPEN")} disabled={busy}>
            Open now
          </Button>
        )}
        {mode === "edit" && form.status === "OPEN" && (
          <Button variant="secondary" onClick={() => setStatusTarget("CLOSED")} disabled={busy}>
            Close assessment
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget!)}
        busy={busy}
        title={statusTarget === "OPEN" ? "Open this assessment?" : "Close this assessment?"}
        message={
          statusTarget === "OPEN"
            ? "Students in the assigned group will be able to start it immediately."
            : "Students cannot start or answer anymore. Attempts in progress are submitted automatically with their saved answers."
        }
        confirmLabel={statusTarget === "OPEN" ? "Open" : "Close"}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function statusLabel(status: string) {
  return status === "DRAFT"
    ? "Draft"
    : status === "SCHEDULED"
      ? "Scheduled"
      : status === "OPEN"
        ? "Open"
        : status === "CLOSED"
          ? "Closed"
          : "Archived";
}
