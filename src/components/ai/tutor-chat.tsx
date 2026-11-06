"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

const MODES = [
  { id: "CONVERSATION", label: "Conversation" },
  { id: "VOCABULARY", label: "Vocabulary" },
  { id: "GRAMMAR", label: "Grammar" },
  { id: "LESSON_HELP", label: "Lesson help" },
  { id: "MISTAKE_REVIEW", label: "Mistake review" },
  { id: "QUIZ", label: "Quiz me" },
  { id: "FREE", label: "Free practice" },
];

const PROMPTS = ["Practice English with me.", "Ask me easy questions.", "Practice my vocabulary.", "Help me with this lesson."];

type Msg = { id: string; role: string; content: string };

export function TutorChat({
  level,
  recommendation,
  initialSessionId,
  initialMessages,
}: {
  level: string;
  recommendation: string | null;
  initialSessionId: string | null;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [mode, setMode] = useState("CONVERSATION");
  const [difficulty, setDifficulty] = useState(level === "PRE_A1" || !level ? "EASY" : "NORMAL");
  const [showTranslation, setShowTranslation] = useState(level === "PRE_A1");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function start(nextMode = mode) {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const created = await apiFetch<{ sessionId: string; reply: { text: string }; level: string }>("/api/ai/sessions", {
        method: "POST",
        body: { mode: nextMode, difficulty, showTranslation },
      });
      setSessionId(created.sessionId);
      setMessages([{ id: "open", role: "ASSISTANT", content: created.reply.text }]);
      setMode(nextMode);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "English Tutor is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function send(message: string) {
    if (!sessionId) {
      setText(message);
      return;
    }
    const outgoing = message.trim();
    if (!outgoing) return;
    setText("");
    setBusy(true);
    setThinking(true);
    setError(null);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "USER", content: outgoing }]);
    const controller = new AbortController();
    try {
      const res = await fetch(`/api/ai/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: outgoing }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        throw new ApiClientError(payload?.error || "English Tutor is temporarily unavailable. Please try again.", res.status);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      const id = `a-${Date.now()}`;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "");
          if (!line) continue;
          const event = JSON.parse(line) as { delta?: string; done?: boolean; error?: string };
          if (event.delta) {
            assembled += event.delta;
            setThinking(false);
            setMessages((prev) => {
              const without = prev.filter((item) => item.id !== id);
              return [...without, { id, role: "ASSISTANT", content: assembled }];
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof ApiClientError ? err.message : "English Tutor is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
      setThinking(false);
    }
  }

  async function endSession() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ summary: { vocabularyPracticed: number; grammar: string | null; mistakesReviewed: number; next: string } }>(
        `/api/ai/sessions/${sessionId}/end`,
        { method: "POST" }
      );
      const s = result.summary;
      setSummary(`Today's practice. Vocabulary practiced: ${s.vocabularyPracticed}. Grammar: ${s.grammar ?? "—"}. Corrections noted: ${s.mistakesReviewed}. Next: ${s.next}. This is not a grade.`);
      setSessionId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not end the session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">English Tutor</p>
        <h1 className="text-xl font-semibold">Practice assistant</h1>
        <p className="mt-1 text-sm text-muted">Level: {level || "Not assessed yet"}. This is AI Practice, not a teacher and not an exam. <Link href="/student/tutor/history" className="underline">Your sessions</Link></p>
      </header>
      {recommendation && <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">Suggested next step: {recommendation}</p>}
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Practice mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            aria-pressed={mode === item.id}
            onClick={() => start(item.id)}
            className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === item.id ? "border-foreground bg-foreground text-surface" : "border-border"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="text-muted">Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="ml-2 rounded-lg border border-border px-2 py-1">
            <option value="EASY">Easy</option>
            <option value="NORMAL">Normal</option>
            <option value="CHALLENGE">Challenge</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showTranslation} onChange={(e) => setShowTranslation(e.target.checked)} /> Show translation hints</label>
      </div>
      {level === "PRE_A1" && difficulty === "CHALLENGE" && (
        <p className="text-xs text-muted">Challenge is longer than Easy. You can switch back.</p>
      )}
      <div className="min-h-64 max-h-[50dvh] space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface p-3" aria-live="polite">
        {messages.length === 0 && <p className="text-sm text-muted">Choose a practice mode to begin.</p>}
        {messages.map((msg) => (
          <p key={msg.id} className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${msg.role === "USER" ? "ml-8 bg-muted/10" : "mr-6 border border-border"}`}>
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">{msg.role === "USER" ? "You" : "Tutor"}</span>
            {msg.content}
          </p>
        ))}
        {thinking && <p className="text-sm text-muted">Thinking...</p>}
      </div>
      {summary && <p className="rounded-lg border border-border px-3 py-2 text-sm">{summary}</p>}
      <form className="sticky bottom-20 z-20 flex gap-2 rounded-xl border border-border bg-background p-2 lg:bottom-0" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label htmlFor="tutor-message" className="sr-only">Message</label>
        <input id="tutor-message" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} enterKeyHint="send" autoComplete="off" placeholder="Type in English..." className="min-h-11 min-w-0 flex-1 rounded-lg border border-border px-3 text-base" />
        <Button type="button" variant="secondary" className="min-h-11" onClick={() => setError("Voice recognition is unavailable. Type instead.")}>Voice</Button>
        <Button type="submit" className="min-h-11" disabled={busy || !text.trim()}>Send</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <button key={prompt} type="button" className="rounded-full border border-border px-2 py-1 text-xs" onClick={() => send(prompt)} disabled={busy || !sessionId}>{prompt}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => start(mode)}>New conversation</Button>
        <Button variant="secondary" disabled={busy || !sessionId} onClick={endSession}>End and summarize</Button>
        {sessionId && messages.at(-1)?.role === "ASSISTANT" && (
          <Button variant="ghost" disabled={busy} onClick={() => apiFetch("/api/ai/feedback", { method: "POST", body: { sessionId, rating: "HELPFUL" } })}>Helpful</Button>
        )}
        {sessionId && (
          <Button variant="ghost" disabled={busy} onClick={() => apiFetch("/api/ai/feedback", { method: "POST", body: { sessionId, rating: "NOT_HELPFUL" } })}>Not helpful</Button>
        )}
      </div>
    </div>
  );
}
