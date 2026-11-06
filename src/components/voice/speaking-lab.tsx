"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  /** Not implemented by every browser; used to abandon a stuck recognition. */
  abort?: () => void;
};

/** Bounded wait for a recognition result before the lab offers a way out. */
const RECOGNITION_TIMEOUT_MS = 10_000;

type Topic = { id: string; title: string };

export function SpeakingLab({
  topics,
  beginner,
  lessonId,
  accepted,
}: {
  topics: Topic[];
  beginner: boolean;
  lessonId?: string;
  accepted: boolean;
}) {
  const [consent, setConsent] = useState(accepted);
  const [topic, setTopic] = useState(topics[0]?.id ?? "greetings");
  const [kind, setKind] = useState("SPEAKING");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [heard, setHeard] = useState("");
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState<"Ready" | "Listening" | "Processing" | "Finished" | "Error">("Ready");
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [typed, setTyped] = useState("");
  const [lastSource, setLastSource] = useState<"STT" | "TYPED" | null>(null);
  const [speed, setSpeed] = useState(beginner ? "0.75" : "1");
  const [target, setTarget] = useState("");
  const recognitionRef = useRef<{ rec: SpeechRec; attempt: number } | null>(null);
  const attemptRef = useRef(0);
  const recognitionTimer = useRef<number | null>(null);

  useEffect(() => {
    setTarget(prompt);
  }, [prompt]);

  useEffect(
    () => () => {
      if (recognitionTimer.current !== null) window.clearTimeout(recognitionTimer.current);
      const current = recognitionRef.current;
      recognitionRef.current = null;
      if (current) {
        try {
          if (typeof current.rec.abort === "function") current.rec.abort();
          else current.rec.stop();
        } catch {
          /* unmounting */
        }
      }
    },
    []
  );

  async function accept() {
    await apiFetch("/api/voice/consent", { method: "POST", body: { accept: true } });
    setConsent(true);
  }

  async function start(nextKind = kind) {
    setError(null);
    setFeedback("");
    setHeard("");
    try {
      const created = await apiFetch<{ sessionId: string; prompt: string }>("/api/voice/sessions", {
        method: "POST",
        body: { kind: nextKind, topic, lessonId },
      });
      setSessionId(created.sessionId);
      setPrompt(created.prompt);
      setKind(nextKind);
      setState("Ready");
      speak(created.prompt);
    } catch (err) {
      setState("Error");
      setError(err instanceof ApiClientError ? err.message : "Voice practice is temporarily unavailable.");
    }
  }

  function speak(text: string) {
    const synth = window.speechSynthesis;
    if (!synth) {
      setError("Audio is unavailable. Read the sentence below.");
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = Number(speed);
    utter.lang = "en-US";
    synth.speak(utter);
    apiFetch("/api/voice/speak", { method: "POST", body: { text, provider: "browser" } }).catch(() => undefined);
  }

  /** Plain-language explanation for a recognition failure. Never blames the learner for a
   *  blocked microphone, and never exposes browser internals. */
  function recognitionFailureMessage(reason: string | undefined): string | null {
    switch (reason) {
      case "not-allowed":
      case "service-not-allowed":
        return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again — or type your answer below.";
      case "audio-capture":
        return "No microphone was found. Check that a microphone is connected, then try again — or type your answer below.";
      case "no-speech":
        return "I did not hear any speech. Try again, or type your answer below.";
      case "network":
        return "Speech recognition could not reach its service. Check your connection, or type your answer below.";
      case "aborted":
        return null; // the learner cancelled on purpose
      default:
        return "I couldn't understand the audio. Please try again, or type your answer below.";
    }
  }

  function clearRecognitionTimer() {
    if (recognitionTimer.current !== null) {
      window.clearTimeout(recognitionTimer.current);
      recognitionTimer.current = null;
    }
  }

  /** Stop the active recognition and make any callback from it inert. */
  function stopRecognition(message?: string) {
    clearRecognitionTimer();
    attemptRef.current += 1;
    const current = recognitionRef.current;
    recognitionRef.current = null;
    if (current) {
      try {
        if (typeof current.rec.abort === "function") current.rec.abort();
        else current.rec.stop();
      } catch {
        /* the engine is already gone */
      }
    }
    setState(message ? "Error" : "Ready");
    setError(message ?? null);
  }

  function listen() {
    if (state === "Listening") {
      stopRecognition();
      return;
    }
    if (!sessionId) {
      setState("Ready");
      setError("Choose a practice mode above first, then press Start speaking.");
      return;
    }
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Ctor) {
      setState("Error");
      setError("Voice recognition is unavailable on this browser. You can type your answer below.");
      return;
    }
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setState("Listening");
    setError(null);
    const rec = new Ctor();
    recognitionRef.current = { rec, attempt };
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (event) => {
      if (attemptRef.current !== attempt) return; // a newer attempt owns the UI now
      clearRecognitionTimer();
      recognitionRef.current = null;
      const piece = event.results[0]?.[0];
      setHeard(piece?.transcript ?? "");
      setLastSource("STT");
      setState("Processing");
      submit(piece?.transcript ?? "", "STT", typeof piece?.confidence === "number" ? piece.confidence : null);
    };
    rec.onerror = (event) => {
      if (attemptRef.current !== attempt) return;
      clearRecognitionTimer();
      recognitionRef.current = null;
      const message = recognitionFailureMessage(event?.error);
      if (message === null) {
        setState("Ready");
        return;
      }
      setState("Error");
      setError(message);
    };
    rec.onend = () => {
      if (attemptRef.current !== attempt) return;
      clearRecognitionTimer();
      recognitionRef.current = null;
      setState((current) => (current === "Listening" ? "Finished" : current));
    };
    try {
      rec.start();
    } catch {
      clearRecognitionTimer();
      recognitionRef.current = null;
      setState("Error");
      setError("Microphone is unavailable. You can type your answer below.");
      return;
    }
    clearRecognitionTimer();
    recognitionTimer.current = window.setTimeout(() => {
      if (attemptRef.current !== attempt || !recognitionRef.current) return;
      stopRecognition("Speech recognition did not respond. Try again, or type your answer below.");
    }, RECOGNITION_TIMEOUT_MS);
  }

  async function submit(transcript: string, source: "STT" | "TYPED", confidence: number | null) {
    if (!sessionId) return;
    // Prevent duplicate submissions while processing.
    if (state === "Processing") return;
    setState("Processing");
    setLastSource(source);
    try {
      const result = await apiFetch<{ understood: boolean; feedback: string; recognized: string | null; assistant: string | null }>(
        `/api/voice/sessions/${sessionId}/turn`,
        { method: "POST", body: { target, transcript, source, provider: source === "TYPED" ? "typed" : "browser", providerConfidence: confidence, retry: source === "STT" && Boolean(heard) } }
      );
      setHeard(result.recognized ?? transcript);
      setFeedback(result.assistant || result.feedback);
      setState("Finished");
      if (result.assistant) speak(result.assistant);
    } catch (err) {
      setState("Error");
      setError(err instanceof ApiClientError ? err.message : "Connection problem. Please try again.");
    }
  }

  return (
    <div className={`mx-auto w-full max-w-lg ${beginner ? "text-base" : "text-sm"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Speaking lab</p>
      <h1 className={`${beginner ? "text-2xl" : "text-xl"} font-semibold`}>Listen. Speak. Try again.</h1>
      <p className="mt-1 text-muted">This stores the words recognized, not a recording. It is practice, not a grade.</p>
      <p className="mt-2 text-sm"><Link className="underline" href="/student/speaking/history">Speaking history</Link></p>
      {!consent && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p>The microphone stays on this device. We save the text that was recognized. We do not save the recording.</p>
          <Button className="mt-3 h-12" onClick={accept}>I understand</Button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg border border-danger/30 px-3 py-2 text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["SPEAKING", "Speak"],
          ["PRONUNCIATION", "Repeat a word"],
          ["SHADOWING", "Shadow"],
          ["VOICE_CHAT", "Talk with tutor"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`min-h-11 rounded-full border px-4 py-2 ${kind === id ? "bg-foreground text-surface" : "border-border"}`} onClick={() => start(id)}>{label}</button>
        ))}
      </div>
      <label className="mt-3 block text-muted">Topic
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border px-2">
          {topics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-muted">Speed
        <select value={speed} onChange={(e) => setSpeed(e.target.value)} className="mt-1 h-11 rounded-lg border border-border px-2">
          <option value="0.75">0.75x</option>
          <option value="1">1.0x</option>
          <option value="1.25">1.25x</option>
        </select>
      </label>
      <section className="mt-4 rounded-2xl border border-border bg-surface p-4" aria-live="polite">
        <p className="text-xs uppercase tracking-wide text-muted">{state}</p>
        <p className="mt-2 whitespace-pre-wrap text-lg">{prompt || "Choose Speak to begin."}</p>
        {heard && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {lastSource === "STT" ? "Recognized (from your voice)" : lastSource === "TYPED" ? "Typed by you" : "Transcript"}
            </p>
            <p className="mt-1 text-[15px] font-medium text-emerald-900" dir="auto">
              “{heard}”
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {lastSource === "STT" ? "This is what was heard — not a grade." : "You typed this — also practice, not a grade."}
            </p>
          </div>
        )}
        {feedback && <p className="mt-2">{feedback}</p>}
        {kind === "SHADOWING" && (
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium text-muted hover:bg-muted/10"
            onClick={() => setShowTranscript((v) => !v)}
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
        )}
        {showTranscript && <p className="mt-2">{prompt}</p>}
      </section>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="h-14" disabled={!consent || !sessionId} onClick={listen}>{state === "Listening" ? "Stop listening" : "Start speaking"}</Button>
        <Button className="h-14" variant="secondary" disabled={!prompt} onClick={() => speak(prompt)}>Hear</Button>
        <Button className="h-12" variant="secondary" disabled={!sessionId} onClick={() => submit(typed || heard, "TYPED", null)}>Try again</Button>
        <Button className="h-12" variant="secondary" onClick={() => setShowHelp((v) => !v)}>Show help</Button>
      </div>
      {!sessionId && (
        <p className="mt-2 text-[13px] text-muted">
          Pick a practice mode above to start a session. The microphone only starts once a session exists, so nothing is
          listened to or thrown away by accident.
        </p>
      )}
      {showHelp && <p className="mt-2 text-muted">Press Start speaking, or type the sentence. Then press Try again.</p>}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(typed, "TYPED", null); }}>
        <label htmlFor="typed-answer" className="sr-only">Type your answer</label>
        <input id="typed-answer" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type your answer" className="h-12 min-w-0 flex-1 rounded-lg border border-border px-3" />
        <Button className="h-12" type="submit" disabled={!sessionId || !typed.trim()}>Send</Button>
      </form>
    </div>
  );
}
