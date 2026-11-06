"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SpeakingActivityProps {
  text: string;
  tip?: string | null;
  translation?: string | null;
  modelAudioUrl?: string | null;
  alreadyPracticed?: boolean;
  onSubmit: () => Promise<void>;
}

type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "listening"
  | "processing"
  | "recognized"
  | "denied"
  | "unsupported"
  | "typing"
  | "error";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

const RECOGNITION_TIMEOUT_MS = 10_000;

function recognitionFailureMessage(reason: string | undefined): string | null {
  switch (reason) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again — or type instead.";
    case "audio-capture":
      return "No microphone was found. Check that a microphone is connected, then try again — or type instead.";
    case "no-speech":
      return "I did not hear any speech. Try again, or type instead.";
    case "network":
      return "Speech recognition could not reach its service. Check your connection, or type instead.";
    case "aborted":
      return null;
    default:
      return "I couldn't understand the audio. Please try again, or type instead.";
  }
}

/**
 * Speaking prompt — honest speech recognition + fallback.
 * Shows the sentence to say and offers:
 * - browser-native SpeechRecognition when available (honest capability detection, no fake transcript)
 * - MediaRecorder fallback when recognition unavailable
 * - typing fallback always
 * All paths preserve COMPLETED (isCorrect=null) — no pronunciation scoring fabricated.
 * Audio is never uploaded; recording stays on device.
 */
export function SpeakingActivity({ text, tip, translation, modelAudioUrl, alreadyPracticed, onSubmit }: SpeakingActivityProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptSource, setTranscriptSource] = useState<"STT" | "TYPED" | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(alreadyPracticed));
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<{ rec: SpeechRec; attempt: number } | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Detect browser-native recognition once.
  useEffect(() => {
    const Ctor =
      typeof window !== "undefined"
        ? (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
        : null;
    setSpeechSupported(Boolean(Ctor));
  }, []);

  // Cleanup on unmount — stop tracks and abort recognition so no background listening.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const cur = recognitionRef.current;
      recognitionRef.current = null;
      if (cur) {
        try {
          if (typeof cur.rec.abort === "function") cur.rec.abort();
          else cur.rec.stop();
        } catch {
          /* unmounting */
        }
      }
    };
  }, []);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopRecognition(message?: string) {
    clearTimer();
    attemptRef.current += 1;
    const cur = recognitionRef.current;
    recognitionRef.current = null;
    if (cur) {
      try {
        if (typeof cur.rec.abort === "function") cur.rec.abort();
        else cur.rec.stop();
      } catch {
        /* already gone */
      }
    }
    if (message) {
      setRecorderState("error");
      setError(message);
    } else {
      setRecorderState("idle");
    }
  }

  async function startListening() {
    if (busy || recorderState === "requesting" || recorderState === "listening") return;
    setError(null);
    setTranscript(null);
    setTranscriptSource(null);

    const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;

    if (!Ctor) {
      setRecorderState("unsupported");
      setError("Voice recognition is unavailable on this browser. You can type your answer below — it counts the same.");
      return;
    }

    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setRecorderState("requesting");
    setError(null);

    // Small delay to show requesting state before permission prompt.
    await new Promise((r) => setTimeout(r, 150));

    try {
      setRecorderState("listening");
      const rec = new Ctor();
      recognitionRef.current = { rec, attempt };
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.onresult = (event) => {
        if (attemptRef.current !== attempt) return;
        clearTimer();
        recognitionRef.current = null;
        const piece = event.results[0]?.[0];
        const heard = piece?.transcript?.trim() ?? "";
        if (!heard) {
          setRecorderState("error");
          setError("I did not hear any speech. Try again, or type instead.");
          return;
        }
        setTranscript(heard);
        setTranscriptSource("STT");
        setRecorderState("recognized");
        setError(null);
      };
      rec.onerror = (event) => {
        if (attemptRef.current !== attempt) return;
        clearTimer();
        recognitionRef.current = null;
        const msg = recognitionFailureMessage(event?.error);
        if (msg === null) {
          setRecorderState("idle");
          return;
        }
        setRecorderState(event?.error === "not-allowed" || event?.error === "service-not-allowed" ? "denied" : "error");
        setError(msg);
      };
      rec.onend = () => {
        if (attemptRef.current !== attempt) return;
        clearTimer();
        recognitionRef.current = null;
        setRecorderState((cur) => (cur === "listening" ? "error" : cur));
        setError((prev) => prev ?? "I did not hear any speech. Try again, or type instead.");
      };
      rec.start();
      // Bounded wait — do not leave learner in Listening forever.
      timerRef.current = window.setTimeout(() => {
        if (attemptRef.current !== attempt || !recognitionRef.current) return;
        stopRecognition("Speech recognition did not respond. Try again, or type instead.");
      }, RECOGNITION_TIMEOUT_MS);
    } catch {
      clearTimer();
      recognitionRef.current = null;
      setRecorderState("error");
      setError("Microphone is unavailable. You can type your answer below.");
    }
  }

  function stopListening() {
    stopRecognition();
  }

  async function startRecording() {
    if (busy || recorderState === "requesting" || recorderState === "recording") return;
    setError(null);
    setTranscript(null);
    setTranscriptSource(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecorderState("unsupported");
      setError("Recording is not supported on this device — practicing out loud works just as well. You can also type.");
      return;
    }
    try {
      setRecorderState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setRecordedUrl(URL.createObjectURL(blob));
        setRecorderState("recorded");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecorderState("recording");
    } catch {
      setRecorderState("denied");
      setError("Microphone was not available. Type the sentence below, then mark that you practiced. This is not a pronunciation score.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function markPracticed() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit();
      setDone(true);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleTypedSubmit() {
    const t = typed.trim();
    if (!t) {
      setError("Type the sentence first, then mark that you practiced.");
      return;
    }
    setTranscript(t);
    setTranscriptSource("TYPED");
    setRecorderState("recognized");
    setError(null);
  }

  return (
    <div>
      <div className="rounded-xl border border-primary/25 bg-primary-subtle/40 p-4">
        <p className="text-[13px] font-medium uppercase tracking-wide text-primary">Say this</p>
        <p className="mt-1.5 text-lg font-semibold leading-8 text-foreground" dir="auto">
          “{text}”
        </p>
        {translation && (
          <p className="mt-0.5 text-[13px] text-muted" dir="auto">
            {translation}
          </p>
        )}
        {tip && <p className="mt-1.5 text-[13px] text-muted">{tip}</p>}
      </div>

      {/* Transcript area — distinguishes recognized vs typed */}
      {transcript && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            {transcriptSource === "STT" ? "Recognized (from your voice)" : "Typed by you"}
          </p>
          <p className="mt-1 text-[15px] font-medium text-emerald-900" dir="auto">
            “{transcript}”
          </p>
          <p className="mt-1 text-xs text-emerald-700">This is your transcript — not a grade. Press “I practiced this” to save.</p>
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {/* Speech recognition path — honest capability detection */}
        {speechSupported ? (
          <>
            {(recorderState === "idle" || recorderState === "recognized" || recorderState === "recorded" || recorderState === "error") && (
              <Button variant="secondary" onClick={startListening} className="min-h-11" disabled={busy}>
                <Mic className="h-4 w-4" aria-hidden /> Speak now
              </Button>
            )}
            {recorderState === "requesting" && (
              <p role="status" className="text-[13px] text-muted">
                Requesting microphone permission…
              </p>
            )}
            {recorderState === "listening" && (
              <Button variant="danger" onClick={stopListening} className="min-h-11" aria-label="Stop listening">
                <Square className="h-4 w-4" aria-hidden /> Stop listening
              </Button>
            )}
            {(recorderState === "idle" || recorderState === "denied" || recorderState === "unsupported" || recorderState === "error") && (
              <Button variant="secondary" className="min-h-11" onClick={() => setRecorderState("typing")}>
                Type instead
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Fallback: MediaRecorder when speech recognition not available */}
            {recorderState === "idle" && (
              <Button variant="secondary" onClick={startRecording} className="min-h-11" disabled={busy}>
                <Mic className="h-4 w-4" aria-hidden /> Record myself (optional)
              </Button>
            )}
            {recorderState === "requesting" && (
              <p role="status" className="text-[13px] text-muted">
                Waiting for microphone permission…
              </p>
            )}
            {recorderState === "recording" && (
              <Button variant="danger" onClick={stopRecording} className="min-h-11">
                <Square className="h-4 w-4" aria-hidden /> Stop recording
              </Button>
            )}
            {(recorderState === "idle" || recorderState === "denied" || recorderState === "unsupported") && (
              <Button variant="secondary" className="min-h-11" onClick={() => setRecorderState("typing")}>
                Type instead
              </Button>
            )}
          </>
        )}

        {recorderState === "denied" && (
          <p role="status" className="w-full text-[13px] text-muted">
            Microphone was not available. Type the sentence below, then mark that you practiced. This is not a pronunciation score.
          </p>
        )}
        {recorderState === "unsupported" && (
          <p role="status" className="text-[13px] text-muted">
            Voice recognition is not supported on this browser — practicing out loud works just as well. You can type instead and it counts the same.
          </p>
        )}
        {recorderState === "error" && error && (
          <p role="alert" className="w-full text-[13px] text-danger">
            {error}
          </p>
        )}
        {recorderState === "recorded" && recordedUrl && (
          <div className="flex items-center gap-2">
            <audio controls src={recordedUrl} className="h-9" aria-label="Your recording" />
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => {
                setRecordedUrl(null);
                setRecorderState("idle");
                setTranscript(null);
                setTranscriptSource(null);
              }}
            >
              Re-record
            </Button>
          </div>
        )}

        {recorderState === "recognized" && transcript && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => {
              setRecorderState("idle");
              setTranscript(null);
              setTranscriptSource(null);
              setError(null);
            }}
          >
            Try again
          </Button>
        )}

        {modelAudioUrl && (
          <Button variant="ghost" onClick={() => void new Audio(modelAudioUrl).play().catch(() => undefined)} className="min-h-11">
            <Volume2 className="h-4 w-4" aria-hidden /> Hear a model
          </Button>
        )}
      </div>

      {/* Typing fallback — always available, explicit */}
      {(recorderState === "typing" || recorderState === "denied" || recorderState === "unsupported" || recorderState === "error") && (
        <div className="mt-3">
          <label htmlFor="speaking-typed-input" className="block text-sm font-medium text-foreground">
            Type the sentence
          </label>
          <textarea
            id="speaking-typed-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={text}
            className="mt-1 min-h-24 w-full rounded-lg border border-border p-3 text-base"
            dir="auto"
          />
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" className="min-h-11" onClick={handleTypedSubmit} disabled={!typed.trim()}>
              Use typed text
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={() => setRecorderState("idle")}>
              Back
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">Typed text is saved as your transcript — also not a grade. Same progress.</p>
        </div>
      )}

      {!done ? (
        <div className="mt-3.5">
          <Button onClick={markPracticed} loading={busy} disabled={busy} className="min-h-11 w-full sm:w-auto">
            {busy ? "Saving…" : "I practiced this"}
          </Button>
          {error && recorderState !== "error" && (
            <p role="alert" className="mt-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Pronunciation feedback is not available yet — your practice is saved for future coaching. Audio is not uploaded.
          </p>
        </div>
      ) : (
        <p role="status" className="mt-3.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-900">
          ✓ Practiced — great work!
        </p>
      )}
    </div>
  );
}
