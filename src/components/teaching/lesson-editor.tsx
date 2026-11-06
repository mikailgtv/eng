"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

const TYPES = ["HEADING", "TEXT", "VOCABULARY", "GRAMMAR", "EXAMPLE", "IMAGE", "AUDIO", "VIDEO", "TIP", "WARNING", "QUESTION"] as const;

type Block = { id: string; type: string; data: Record<string, unknown> };

const EMPTY: Record<string, Record<string, unknown>> = {
  HEADING: { text: "", level: 2 },
  TEXT: { text: "" },
  VOCABULARY: { items: [{ word: "", translation: "" }] },
  GRAMMAR: { title: "", explanation: "" },
  EXAMPLE: { items: [{ text: "" }] },
  IMAGE: { url: "", alt: "" },
  AUDIO: { url: "", title: "" },
  VIDEO: { url: "", title: "" },
  TIP: { text: "" },
  WARNING: { text: "" },
  QUESTION: { prompt: "", answer: "" },
};

export function LessonEditor({ lessonId, status, blocks }: { lessonId: string; status: string; blocks: Block[] }) {
  const router = useRouter();
  const [type, setType] = useState<string>("TEXT");
  const [draft, setDraft] = useState<Record<string, unknown>>(EMPTY.TEXT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setField(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" && (
          <Button
            disabled={busy || blocks.length === 0}
            onClick={() => {
              if (!confirm("Publish this lesson? Students will be able to open it.")) return;
              run(() => apiFetch(`/api/teaching/lessons/${lessonId}`, { method: "PATCH", body: { status: "PUBLISHED" } }));
            }}
          >
            Publish lesson
          </Button>
        )}
        {status === "PUBLISHED" && (
          <Button variant="secondary" disabled={busy} onClick={() => run(() => apiFetch(`/api/teaching/lessons/${lessonId}`, { method: "PATCH", body: { status: "DRAFT" } }))}>
            Unpublish
          </Button>
        )}
        {status !== "ARCHIVED" && (
          <Button variant="secondary" disabled={busy} onClick={() => {
            if (!confirm("Archive this lesson? Students will no longer see it.")) return;
            run(() => apiFetch(`/api/teaching/lessons/${lessonId}`, { method: "PATCH", body: { status: "ARCHIVED" } }));
          }}>
            Archive
          </Button>
        )}
      </div>

      <ol className="space-y-3">
        {blocks.map((block, index) => (
          <li key={block.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{block.type}</p>
              <div className="flex gap-1">
                <Button variant="secondary" disabled={busy || index === 0} onClick={() => run(() => apiFetch(`/api/teaching/blocks/${block.id}/move`, { method: "POST", body: { direction: -1 } }))}>Up</Button>
                <Button variant="secondary" disabled={busy || index === blocks.length - 1} onClick={() => run(() => apiFetch(`/api/teaching/blocks/${block.id}/move`, { method: "POST", body: { direction: 1 } }))}>Down</Button>
                <Button variant="secondary" disabled={busy} onClick={() => {
                  if (!confirm("Delete this block?")) return;
                  run(() => apiFetch(`/api/teaching/blocks/${block.id}`, { method: "DELETE" }));
                }}>Delete</Button>
              </div>
            </div>
            <EditableBlock block={block} busy={busy} onSave={(data) => run(() => apiFetch(`/api/teaching/blocks/${block.id}`, { method: "PATCH", body: { type: block.type, data } }))} />
          </li>
        ))}
      </ol>

      <form
        className="rounded-xl border border-dashed border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await apiFetch(`/api/teaching/lessons/${lessonId}/blocks`, { method: "POST", body: { type, data: draft } });
            setDraft(EMPTY[type] ?? { text: "" });
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add a block</h2>
        <label htmlFor="block-type" className="mt-2 block text-xs text-muted">Type</label>
        <select
          id="block-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setDraft(EMPTY[e.target.value] ?? { text: "" });
          }}
          className="mt-1 rounded-lg border border-border px-2 py-1.5 text-sm"
        >
          {TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="mt-3">
          <BlockFields data={draft} onChange={setDraft} live />
        </div>
        <Button className="mt-3" type="submit" disabled={busy}>Add block</Button>
      </form>
    </div>
  );
}

function EditableBlock({ block, busy, onSave }: { block: Block; busy: boolean; onSave: (data: Record<string, unknown>) => void }) {
  const [data, setData] = useState(block.data);
  return (
    <div>
      <BlockFields data={data} onChange={setData} live />
      <Button className="mt-2" variant="secondary" disabled={busy} onClick={() => onSave(data)}>Save block</Button>
    </div>
  );
}

function BlockFields({
  data,
  onChange,
  live,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  live?: boolean;
}) {
  const text = typeof data.text === "string" ? data.text : "";
  const title = typeof data.title === "string" ? data.title : "";
  const url = typeof data.url === "string" ? data.url : "";
  const alt = typeof data.alt === "string" ? data.alt : "";
  const prompt = typeof data.prompt === "string" ? data.prompt : "";
  const answer = typeof data.answer === "string" ? data.answer : "";
  const explanation = typeof data.explanation === "string" ? data.explanation : "";

  if ("prompt" in data || "answer" in data) {
    return (
      <div className="grid gap-2">
        <Field label="Question" value={prompt} onChange={(v) => onChange({ ...data, prompt: v })} live={live} />
        <Field label="Answer" value={answer} onChange={(v) => onChange({ ...data, answer: v })} live={live} />
      </div>
    );
  }
  if ("items" in data && Array.isArray(data.items)) {
    const items = data.items as Record<string, string>[];
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            {"word" in item ? (
              <>
                <Field label="Word" value={item.word ?? ""} onChange={(v) => onChange({ ...data, items: items.map((row, j) => j === i ? { ...row, word: v } : row) })} live={live} />
                <Field label="Translation" value={item.translation ?? ""} onChange={(v) => onChange({ ...data, items: items.map((row, j) => j === i ? { ...row, translation: v } : row) })} live={live} />
              </>
            ) : (
              <Field label="Example" value={item.text ?? ""} onChange={(v) => onChange({ ...data, items: items.map((row, j) => j === i ? { ...row, text: v } : row) })} live={live} />
            )}
          </div>
        ))}
      </div>
    );
  }
  if ("url" in data) {
    return (
      <div className="grid gap-2">
        <Field label="URL or site path" value={url} onChange={(v) => onChange({ ...data, url: v })} live={live} />
        {"alt" in data && <Field label="Alt text" value={alt} onChange={(v) => onChange({ ...data, alt: v })} live={live} />}
        {"title" in data && <Field label="Title" value={title} onChange={(v) => onChange({ ...data, title: v })} live={live} />}
        <p className="text-xs text-muted">Do not invent an audio file. Leave the URL empty until a real file exists — empty audio cannot be saved.</p>
      </div>
    );
  }
  if ("explanation" in data || ("title" in data && !("text" in data))) {
    return (
      <div className="grid gap-2">
        <Field label="Title" value={title} onChange={(v) => onChange({ ...data, title: v })} live={live} />
        <Field label="Explanation" value={explanation} onChange={(v) => onChange({ ...data, explanation: v })} live={live} />
      </div>
    );
  }
  return <Field label="Text" value={text} onChange={(v) => onChange({ ...data, text: v })} live={live} />;
}

function Field({ label, value, onChange, live }: { label: string; value: string; onChange: (v: string) => void; live?: boolean }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <textarea
        value={value}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        onBlur={live ? undefined : () => onChange(value)}
        className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm text-foreground"
      />
    </label>
  );
}
