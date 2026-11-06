"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

export interface QuestionFormDefaults {
  id?: string;
  type: string;
  questionText: string;
  explanation: string;
  difficulty: string;
  points: number;
  skill: string;
  lessonId: string;
  status: string;
  configuration: Record<string, unknown>;
  options: { text: string; isCorrect: boolean }[];
}

export interface ReferenceData {
  levels: { id: string; code: string; displayName: string | null }[];
  lessons: { id: string; title: string; courseTitle: string; levelId: string }[];
}

const TYPES = [
  ["MULTIPLE_CHOICE", "Multiple choice"],
  ["TRUE_FALSE", "True or false"],
  ["FILL_BLANK", "Fill the blank"],
  ["MATCHING", "Matching"],
  ["WORD_ORDER", "Word order"],
  ["LISTENING", "Listening (audio + choice)"],
  ["READING", "Reading (manual grading later)"],
  ["WRITING", "Writing (manual grading later)"],
  ["SPEAKING", "Speaking (manual grading later)"],
];
const SKILLS = ["VOCABULARY", "GRAMMAR", "READING", "LISTENING", "SPEAKING", "WRITING"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export const EMPTY_QUESTION: QuestionFormDefaults = {
  type: "MULTIPLE_CHOICE",
  questionText: "",
  explanation: "",
  difficulty: "EASY",
  points: 1,
  skill: "GRAMMAR",
  lessonId: "",
  status: "DRAFT",
  configuration: {},
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
};

/** Create/edit form for one question-bank question (staff only). */
export function QuestionForm({
  defaults,
  reference,
  isEdit,
}: {
  defaults: QuestionFormDefaults;
  reference: ReferenceData;
  isEdit: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [form, setForm] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const config = useMemo(() => form.configuration as Record<string, unknown>, [form.configuration]);
  const lesson = reference.lessons.find((l) => l.id === form.lessonId);

  function set<K extends keyof QuestionFormDefaults>(key: K, value: QuestionFormDefaults[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setConfig(key: string, value: unknown) {
    setForm((f) => ({ ...f, configuration: { ...f.configuration, [key]: value } }));
  }

  function buildPayload() {
    return {
      type: form.type,
      questionText: form.questionText,
      explanation: form.explanation.trim() ? form.explanation.trim() : null,
      difficulty: form.difficulty,
      points: form.points,
      skill: form.skill || null,
      levelId: lesson?.levelId ?? null,
      lessonId: form.lessonId || null,
      status: form.status,
      configuration: configForType(form),
      options: needsOptions(form.type) ? form.options : undefined,
    };
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (isEdit && defaults.id) {
        await apiFetch(`/api/questions/${defaults.id}`, { method: "PATCH", body: buildPayload() });
        notify("success", "Question saved.");
      } else {
        await apiFetch("/api/questions", { method: "POST", body: buildPayload() });
        notify("success", "Question created.");
        router.push("/teacher/questions");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save the question.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      await apiFetch(`/api/questions/${defaults.id}`, { method: "DELETE" });
      notify("success", "Question archived.");
      router.push("/teacher/questions");
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiClientError ? err.message : "Could not archive the question.");
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
        <FormField label="Question type" htmlFor="q-type">
          <Select id="q-type" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Skill tag" htmlFor="q-skill" hint="for later analytics">
          <Select id="q-skill" value={form.skill} onChange={(e) => set("skill", e.target.value)}>
            <option value="">— none —</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Question" htmlFor="q-text">
        <Textarea
          id="q-text"
          rows={2}
          value={form.questionText}
          onChange={(e) => set("questionText", e.target.value)}
          placeholder="My name ___ Ali."
        />
      </FormField>

      {/* Type-specific editors */}
      {(form.type === "MULTIPLE_CHOICE" || form.type === "LISTENING") && (
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold text-foreground">Answer options</legend>
          {form.type === "LISTENING" && (
            <div className="mb-4 grid gap-3">
              <FormField label="Audio file URL" htmlFor="q-audio" hint="must be a real uploaded file, e.g. /audio/hello-1.mp3">
                <Input
                  id="q-audio"
                  value={(config.audioUrl as string) ?? ""}
                  onChange={(e) => setConfig("audioUrl", e.target.value)}
                  placeholder="/audio/hello-1.mp3"
                />
              </FormField>
              <FormField label="Transcript (server-side only)" htmlFor="q-transcript">
                <Textarea
                  id="q-transcript"
                  rows={2}
                  value={(config.transcript as string) ?? ""}
                  onChange={(e) => setConfig("transcript", e.target.value)}
                />
              </FormField>
            </div>
          )}
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <label className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={opt.isCorrect}
                    onChange={() =>
                      set(
                        "options",
                        form.options.map((o, j) => ({ text: o.text, isCorrect: j === i }))
                      )
                    }
                  />
                  Correct
                </label>
                <Input
                  value={opt.text}
                  onChange={(e) =>
                    set(
                      "options",
                      form.options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o))
                    )
                  }
                  placeholder={`Option ${i + 1}`}
                  dir="auto"
                />
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={form.options.length <= 2}
                  onClick={() => set("options", form.options.filter((_, j) => j !== i))}
                  className="text-muted hover:text-danger disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {form.options.length < 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => set("options", [...form.options, { text: "", isCorrect: false }])}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add option
            </Button>
          )}
        </fieldset>
      )}

      {form.type === "TRUE_FALSE" && (
        <FormField label="Correct answer" htmlFor="q-tf">
          <Select id="q-tf" value={(config.answer as boolean) ? "true" : "false"} onChange={(e) => setConfig("answer", e.target.value === "true")}>
            <option value="true">True</option>
            <option value="false">False</option>
          </Select>
        </FormField>
      )}

      {form.type === "FILL_BLANK" && (
        <FormField label="Accepted answers" htmlFor="q-fill" hint="comma-separated; capitalization and spacing are forgiving">
          <Input
            id="q-fill"
            value={((config.acceptedAnswers as string[]) ?? []).join(", ")}
            onChange={(e) =>
              setConfig(
                "acceptedAnswers",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="is"
          />
        </FormField>
      )}

      {form.type === "WORD_ORDER" && (
        <FormField label="Correct word order" htmlFor="q-wo" hint="comma-separated, in the correct order">
          <Input
            id="q-wo"
            value={((config.words as string[]) ?? []).join(", ")}
            onChange={(e) =>
              setConfig(
                "words",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="My, name, is, Ali"
          />
        </FormField>
      )}

      {form.type === "MATCHING" && (
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold text-foreground">Matching pairs</legend>
          <div className="space-y-2">
            {(((config.pairs as { left: string; right: string }[]) ?? []) as { left: string; right: string }[]).map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={pair.left}
                  onChange={(e) => updatePair(i, "left", e.target.value, config, setConfig)}
                  placeholder="Left (word)"
                  dir="auto"
                />
                <Input
                  value={pair.right}
                  onChange={(e) => updatePair(i, "right", e.target.value, config, setConfig)}
                  placeholder="Right (meaning)"
                  dir="auto"
                />
                <button
                  type="button"
                  aria-label={`Remove pair ${i + 1}`}
                  onClick={() => setConfig("pairs", ((config.pairs as unknown[]) ?? []).filter((_, j) => j !== i))}
                  className="text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              setConfig("pairs", [...(((config.pairs as unknown[]) ?? []) as unknown[]), { left: "", right: "" }])
            }
          >
            <Plus className="h-4 w-4" aria-hidden /> Add pair
          </Button>
        </fieldset>
      )}

      {(form.type === "READING" || form.type === "WRITING" || form.type === "SPEAKING") && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          {form.type.charAt(0) + form.type.slice(1).toLowerCase()} questions are prepared for a future phase — they are
          stored now and clearly marked as needing teacher grading.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Lesson (optional tag)" htmlFor="q-lesson">
          <Select id="q-lesson" value={form.lessonId} onChange={(e) => set("lessonId", e.target.value)}>
            <option value="">— none —</option>
            {reference.lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.courseTitle} — {l.title}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Difficulty" htmlFor="q-diff">
            <Select id="q-diff" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Points" htmlFor="q-points">
            <Input
              id="q-points"
              type="number"
              min={1}
              max={100}
              value={form.points}
              onChange={(e) => set("points", Math.max(1, Number(e.target.value) || 1))}
            />
          </FormField>
          <FormField label="Status" htmlFor="q-status">
            <Select id="q-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </FormField>
        </div>
      </div>

      <FormField label="Explanation (for review)" htmlFor="q-expl" hint="beginner-friendly, shown after submission if reviews are on">
        <Input id="q-expl" value={form.explanation} onChange={(e) => set("explanation", e.target.value)} placeholder="We use “is” with “my name”." />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} loading={busy}>
          {isEdit ? "Save changes" : "Create question"}
        </Button>
        {isEdit && (
          <Button variant="danger" onClick={() => setArchiveOpen(true)} disabled={busy}>
            Archive
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archive}
        busy={busy}
        title="Archive this question?"
        message="Archived questions stay in past results but disappear from the bank and cannot be added to new assessments."
        confirmLabel="Archive"
        danger
      />
    </div>
  );
}

function needsOptions(type: string) {
  return type === "MULTIPLE_CHOICE" || type === "LISTENING";
}

function configForType(form: QuestionFormDefaults): unknown {
  switch (form.type) {
    case "TRUE_FALSE":
      return { answer: (form.configuration.answer as boolean) ?? true };
    case "FILL_BLANK":
      return { acceptedAnswers: (form.configuration.acceptedAnswers as string[]) ?? [] };
    case "MATCHING":
      return {
        pairs: ((form.configuration.pairs as { left: string; right: string }[]) ?? []).filter(
          (p) => p.left.trim() && p.right.trim()
        ),
      };
    case "WORD_ORDER":
      return { words: (form.configuration.words as string[]) ?? [] };
    case "LISTENING":
      return {
        audioUrl: (form.configuration.audioUrl as string) ?? "",
        transcript: (form.configuration.transcript as string) ?? "",
      };
    case "READING":
    case "WRITING":
    case "SPEAKING":
      return { prompt: (form.configuration.prompt as string) ?? undefined };
    default:
      return {};
  }
}

function updatePair(
  index: number,
  side: "left" | "right",
  value: string,
  config: Record<string, unknown>,
  setConfig: (key: string, v: unknown) => void
) {
  const pairs = [...(((config.pairs as { left: string; right: string }[]) ?? []))];
  pairs[index] = { ...pairs[index], [side]: value };
  setConfig("pairs", pairs);
}
