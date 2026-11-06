"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

/** How long to wait for speech to start before treating it as unavailable. */
const SPEECH_START_TIMEOUT_MS = 1500;

type Question = { id: string; type: string; prompt: string; options?: string[]; answer: string; explanation: string };
type Exercise = { id: string; title: string; topic: string; levelCode: string; transcript: string; translation: string | null; questions: Question[] };

export function ListeningLab({ exercises }: { exercises: Exercise[] }) {
  const [current, setCurrent] = useState(exercises[0] ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speed, setSpeed] = useState("0.75");
  const [error, setError] = useState<string | null>(null);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [audioPaused, setAudioPaused] = useState(false);
  const [canPause, setCanPause] = useState(false);
  const startWatchdog = useRef<number | null>(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    setCanPause(Boolean(synth && typeof synth.pause === "function" && typeof synth.resume === "function"));
  }, []);

  useEffect(
    () => () => {
      if (startWatchdog.current !== null) window.clearTimeout(startWatchdog.current);
      window.speechSynthesis?.cancel();
    },
    []
  );

  function clearWatchdog() {
    if (startWatchdog.current !== null) {
      window.clearTimeout(startWatchdog.current);
      startWatchdog.current = null;
    }
  }

  /** Speech cannot be produced here (no voices, blocked, unsupported): read the sentence instead. */
  function speechUnavailable() {
    clearWatchdog();
    setAudioPaused(false);
    setAudioNote("Audio could not be played on this device. The transcript is shown below so you can still read and answer.");
    setShowTranscript(true);
  }

  function stopAudio(note: string | null) {
    const synth = window.speechSynthesis;
    clearWatchdog();
    if (synth) {
      synth.cancel();
      // Some engines leave `paused` set after cancel(), which blocks the next utterance.
      if (synth.paused && typeof synth.resume === "function") synth.resume();
    }
    setAudioPaused(false);
    setAudioNote(note);
  }

  function play(text: string, nextRate = Number(speed)) {
    const synth = window.speechSynthesis;
    if (!synth) {
      speechUnavailable();
      return;
    }
    // Continuing a paused utterance resumes where it stopped instead of replaying it.
    if (audioPaused && synth.paused && typeof synth.resume === "function") {
      synth.resume();
      setAudioPaused(false);
      setAudioNote(null);
      return;
    }
    stopAudio(null);
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = nextRate;
    utter.lang = "en-US";
    let started = false;
    utter.onstart = () => {
      started = true;
      clearWatchdog();
      setAudioNote(null);
    };
    utter.onend = () => {
      clearWatchdog();
      setAudioPaused(false);
    };
    utter.onerror = (event) => {
      // Our own cancel() is reported as "canceled"/"interrupted"; that is not a failure.
      if (event.error === "canceled" || event.error === "interrupted") return;
      speechUnavailable();
    };
    synth.speak(utter);
    setSpeed(String(nextRate));
    setAudioNote(null);
    // Some engines neither start nor report an error. If speech has not begun shortly after the
    // request, say so instead of leaving the learner with silence and no explanation.
    startWatchdog.current = window.setTimeout(() => {
      if (started) return;
      speechUnavailable();
    }, SPEECH_START_TIMEOUT_MS);
  }

  function pauseOrStop() {
    const synth = window.speechSynthesis;
    if (!synth) {
      speechUnavailable();
      return;
    }
    if (!canPause) {
      stopAudio("Stopped. Press Play to start again.");
      return;
    }
    if (audioPaused || synth.paused) {
      if (typeof synth.resume === "function") synth.resume();
      setAudioPaused(false);
      setAudioNote(null);
      return;
    }
    if (!synth.speaking) {
      setAudioNote("Nothing is playing right now.");
      return;
    }
    if (typeof synth.pause === "function") synth.pause();
    setAudioPaused(true);
    setAudioNote("Paused.");
  }

  async function submit() {
    if (!current) return;
    setError(null);
    try {
      const graded = await apiFetch<{ correct: number; total: number; detail: { explanation: string; correct: boolean }[]; label: string }>(
        `/api/voice/listening/${current.id}/submit`,
        { method: "POST", body: { answers } }
      );
      setResult(`${graded.label} ${graded.correct} of ${graded.total} correct. ${graded.detail.map((item) => item.explanation).join(" ")}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Connection problem. Please try again.");
    }
  }

  if (!current) return <p className="text-sm text-muted">No listening practice is published yet.</p>;

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-xl font-semibold">Listening lab</h1>
      <p className="mt-1 text-sm text-muted">Listen first. The transcript stays hidden until you ask for it. This is practice, not an exam.</p>
      <label className="mt-3 block text-sm text-muted">Practice
        <select className="mt-1 h-11 w-full rounded-lg border border-border px-2" value={current.id} onChange={(e) => { stopAudio(null); setCurrent(exercises.find((item) => item.id === e.target.value) ?? current); setResult(null); setShowTranscript(false); }}>
          {exercises.map((item) => <option key={item.id} value={item.id}>{item.levelCode} · {item.topic} · {item.title}</option>)}
        </select>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-12" onClick={() => play(current.transcript, 1)}>Play</Button>
        <Button className="h-12" variant="secondary" onClick={pauseOrStop}>
          {canPause ? (audioPaused ? "Resume" : "Pause") : "Stop"}
        </Button>
        <Button className="h-12" variant="secondary" onClick={() => play(current.transcript, 1)}>Replay</Button>
        <Button className="h-12" variant="secondary" onClick={() => play(current.transcript, 0.75)}>Slow</Button>
        <button type="button" className="h-12 rounded-lg border border-border px-3" onClick={() => setShowTranscript((v) => !v)}>{showTranscript ? "Hide transcript" : "Show transcript"}</button>
        <button type="button" className="h-12 rounded-lg border border-border px-3" onClick={() => setShowTranslation((v) => !v)}>{showTranslation ? "Hide translation" : "Show translation"}</button>
      </div>
      {audioNote && <p role="status" className="mt-2 text-sm">{audioNote}</p>}
      {showTranscript && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border p-3">{current.transcript}</p>}
      {showTranslation && <p className="mt-2 text-sm text-muted">{current.translation || "No translation is stored for this practice."}</p>}
      <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {current.questions.map((q) => (
          <fieldset key={q.id} className="rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-medium">{q.prompt}</legend>
            {(q.options ?? []).map((option) => (
              <label key={option} className="mt-2 flex min-h-11 items-center gap-2">
                <input type="radio" name={q.id} value={option} onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))} />
                {option}
              </label>
            ))}
            {!q.options && (
              <input className="mt-2 h-11 w-full rounded-lg border border-border px-2" onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} />
            )}
          </fieldset>
        ))}
        <Button className="h-12" type="submit">Check</Button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {result && <p className="mt-3 text-sm">{result}</p>}
    </div>
  );
}
