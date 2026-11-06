"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export type DraftBlock = { id: string; type: string; data: Record<string, unknown>; hidden?: boolean };

const TYPES = ["HEADING", "TEXT", "TRANSLATION", "VOCABULARY", "GRAMMAR", "EXAMPLE", "DIALOGUE", "IMAGE", "AUDIO", "VIDEO", "EXERCISE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "MATCHING", "WORD_ORDER", "LISTENING", "SPEAKING", "READING", "WRITING", "FLASHCARDS", "AI_PRACTICE", "TEACHER_NOTE", "TIP", "QUESTION"];

function emptyData(type: string): Record<string, unknown> {
  if (type === "HEADING") return { text: "Heading", level: 2 };
  if (type === "TRANSLATION") return { text: "Hello.", translation: "سلام." };
  if (type === "DIALOGUE") return { lines: [{ speaker: "A", text: "Hello.", translation: "" }] };
  if (type === "MULTIPLE_CHOICE") return { prompt: "Choose one.", options: ["Yes", "No"], answer: "Yes" };
  if (type === "TRUE_FALSE") return { prompt: "This sentence is true.", answer: true };
  if (type === "MATCHING") return { pairs: [{ left: "book", right: "کتاب" }] };
  if (type === "WORD_ORDER") return { words: ["am", "I"], answer: "I am" };
  if (type === "FLASHCARDS") return { cards: [{ front: "book", back: "کتاب" }] };
  if (type === "AI_PRACTICE") return { prompt: "Practice this sentence.", label: "AI Practice" };
  if (type === "LISTENING") return { title: "Listening", transcript: "", audioUrl: "" };
  if (type === "IMAGE" || type === "AUDIO" || type === "VIDEO") return { url: "", alt: "Describe the image", title: "" };
  if (type === "QUESTION" || type === "EXERCISE" || type === "SPEAKING" || type === "WRITING") return { prompt: "", answer: "" };
  return { text: "", title: "", prompt: "" };
}

export function LessonBuilder({ lessonId, initial, savedAt, beginner }: { lessonId: string; initial: DraftBlock[]; savedAt: string | null; beginner: boolean }) {
  const storageKey = `eb-lesson-draft-${lessonId}`;
  const [blocks, setBlocks] = useState<DraftBlock[]>(initial);
  const [past, setPast] = useState<DraftBlock[][]>([]);
  const [future, setFuture] = useState<DraftBlock[][]>([]);
  const [message, setMessage] = useState<string | null>(savedAt ? `Last saved ${savedAt}` : "Not saved yet");
  const [selected, setSelected] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  useEffect(() => {
    const local = localStorage.getItem(storageKey);
    if (!local) return;
    try {
      const parsed = JSON.parse(local) as { blocks: DraftBlock[]; savedAt?: string };
      if (parsed.blocks?.length && (!savedAt || (parsed.savedAt && parsed.savedAt > savedAt))) {
        setBlocks(parsed.blocks);
        setMessage("Recovered an unsaved draft from this browser.");
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, savedAt]);

  function commit(next: DraftBlock[]) {
    setPast((rows) => [...rows.slice(-30), blocks]);
    setFuture([]);
    setBlocks(next);
    localStorage.setItem(storageKey, JSON.stringify({ blocks: next, savedAt: new Date().toISOString() }));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      apiFetch("/api/content/lessons", { method: "POST", body: { action: "draft", lessonId, blocks } })
        .then((result) => {
          const saved = (result as { savedAt?: string }).savedAt;
          setMessage(saved ? `Last saved ${saved}` : "Saved");
          localStorage.setItem(storageKey, JSON.stringify({ blocks, savedAt: saved }));
        })
        .catch((err) => setMessage(err instanceof ApiClientError ? err.message : "Could not save. The browser copy is still here."));
    }, 800);
    return () => clearTimeout(timer);
  }, [blocks, lessonId, storageKey]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (message?.includes("Could not save")) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [message]);

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
    setSelected(to);
  }

  const current = blocks[selected];
  const preview = useMemo(() => blocks.filter((block) => !block.hidden && block.type !== "TEACHER_NOTE"), [blocks]);

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
      <p className="text-sm text-muted lg:col-span-3">On a phone, use the block list and the editor below. The same draft, preview and publish actions are available. Drag is optional; the move buttons work with a finger.</p>
      <aside className="rounded-2xl border border-border p-3">
        <h2 className="text-sm font-semibold">Blocks</h2>
        <label className="mt-2 block text-xs">Add
          <select className="mt-1 h-11 w-full rounded-lg border border-border px-2 text-sm" onChange={(event) => {
            const type = event.target.value;
            commit([...blocks, { id: `b-${Date.now()}`, type, data: emptyData(type) }]);
            setSelected(blocks.length);
          }} defaultValue="">
            <option value="" disabled>Choose a block</option>
            {TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <ul className="mt-3 space-y-1">
          {blocks.map((block, index) => (
            <li key={block.id} draggable onDragStart={() => setDragFrom(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragFrom !== null) move(dragFrom, index); setDragFrom(null); }}>
              <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-2 text-left text-sm" onClick={() => setSelected(index)}>
                <span>{index + 1}. {block.type.replaceAll("_", " ")}{block.hidden ? " · Hidden" : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="rounded-2xl border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Editor {beginner ? "· Pre-A1 mode" : ""}</h2>
          <p className="text-xs text-muted" role="status">{message}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="h-11" onClick={() => { const previous = past[past.length - 1]; if (!previous) return; setFuture((rows) => [blocks, ...rows]); setPast((rows) => rows.slice(0, -1)); setBlocks(previous); }}>Undo</Button>
          <Button type="button" variant="secondary" className="h-11" onClick={() => { const next = future[0]; if (!next) return; setPast((rows) => [...rows, blocks]); setFuture((rows) => rows.slice(1)); setBlocks(next); }}>Redo</Button>
          <Button type="button" variant="secondary" className="h-11" onClick={() => current && move(selected, selected - 1)}>Move up</Button>
          <Button type="button" variant="secondary" className="h-11" onClick={() => current && move(selected, selected + 1)}>Move down</Button>
        </div>
        {current ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-medium">{current.type.replaceAll("_", " ")}{current.type === "AI_PRACTICE" ? " · labeled AI Practice" : ""}</p>
            {Object.entries(current.data).filter(([, value]) => typeof value === "string" || typeof value === "boolean").map(([key, value]) => (
              <label key={key} className="block">
                {key}
                {typeof value === "boolean" ? (
                  <input type="checkbox" className="ml-2" checked={value} onChange={(event) => commit(blocks.map((block, index) => index === selected ? { ...block, data: { ...block.data, [key]: event.target.checked } } : block))} />
                ) : (
                  <textarea className="mt-1 min-h-16 w-full rounded-lg border border-border p-2" value={String(value)} onChange={(event) => commit(blocks.map((block, index) => index === selected ? { ...block, data: { ...block.data, [key]: event.target.value } } : block))} />
                )}
              </label>
            ))}
            <details>
              <summary className="cursor-pointer text-xs text-muted">Advanced JSON</summary>
              <textarea className="mt-1 min-h-28 w-full rounded-lg border border-border p-2" value={JSON.stringify(current.data, null, 2)} onChange={(event) => {
                try {
                  const data = JSON.parse(event.target.value) as Record<string, unknown>;
                  commit(blocks.map((block, index) => index === selected ? { ...block, data } : block));
                } catch {
                  setMessage("JSON is not valid yet. The last valid block is still saved.");
                }
              }} />
            </details>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="h-11" onClick={() => commit(blocks.map((block, index) => index === selected ? { ...block, hidden: !block.hidden } : block))}>{current.hidden ? "Show" : "Hide"}</Button>
              <Button type="button" variant="secondary" className="h-11" onClick={() => commit([...blocks.slice(0, selected + 1), { ...current, id: `b-${Date.now()}` }, ...blocks.slice(selected + 1)])}>Duplicate</Button>
              <Button type="button" variant="secondary" className="h-11" onClick={() => { if (!confirm("Delete this block?")) return; commit(blocks.filter((_, index) => index !== selected)); }}>Delete</Button>
            </div>
          </div>
        ) : <p className="mt-3 text-sm text-muted">Add a block to start.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" className="h-11" onClick={() => apiFetch("/api/content/lessons", { method: "POST", body: { action: "submit", lessonId } }).then(() => setMessage("Submitted for review.")).catch((err) => setMessage(err instanceof ApiClientError ? err.message : "Not submitted."))}>Submit for review</Button>
          <Button type="button" variant="secondary" className="h-11" onClick={() => apiFetch("/api/content/lessons", { method: "POST", body: { action: "quality", lessonId } }).then((result) => setMessage(JSON.stringify(result))).catch((err) => setMessage(err instanceof ApiClientError ? err.message : "Check failed."))}>Check quality</Button>
        </div>
      </section>
      <aside className="rounded-2xl border border-border p-3 text-sm">
        <h2 className="font-semibold">Student preview</h2>
        <p className="mt-1 text-xs text-muted">Hidden blocks and teacher notes are not shown. This preview does not change progress.</p>
        <ul className="mt-3 space-y-2">
          {preview.map((block) => <li key={block.id} className="rounded-lg border border-border px-2 py-2">{block.type === "AI_PRACTICE" ? "AI Practice" : block.type.replaceAll("_", " ")}</li>)}
          {preview.length === 0 && <li className="text-muted">Nothing visible yet.</li>}
        </ul>
      </aside>
    </div>
  );
}
