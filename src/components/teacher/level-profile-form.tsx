"use client";

import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

type Option = { code: string; name: string; displayName: string };
type CourseOption = { id: string; title: string; levelName: string };

export function LevelProfileForm(props: {
  studentId: string;
  currentLevel: string | null;
  targetLevel: string | null;
  learningPace: string;
  dailyGoalMinutes: number;
  assignedCourseId: string | null;
  levels: Option[];
  courses: CourseOption[];
}) {
  const [current, setCurrent] = useState(props.currentLevel ?? "");
  const [target, setTarget] = useState(props.targetLevel ?? "");
  const [courseId, setCourseId] = useState(props.assignedCourseId ?? "");
  const [pace, setPace] = useState(props.learningPace);
  const [minutes, setMinutes] = useState(props.dailyGoalMinutes);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  return <form className="mt-5 space-y-3 rounded-2xl border border-border bg-white p-4" onSubmit={async (event) => {
    event.preventDefault(); setError(""); setSaved(false); setBusy(true);
    try {
      await apiFetch(`/api/teaching/students/${props.studentId}/learning-profile`, {
        method: "PATCH",
        body: {
          currentLevelCode: current,
          targetLevelCode: target || null,
          courseId: courseId || null,
          learningPace: pace,
          dailyGoalMinutes: Number(minutes),
          reason,
        },
      });
      setSaved(true); setReason("");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save the learning assignment.");
    } finally { setBusy(false); }
  }}>
    <div><h2 className="text-sm font-semibold">Teacher-controlled learning plan</h2><p className="mt-1 text-xs text-muted">Changing a level is an explicit teacher decision, recorded in the audit log. A target level does not automatically promote the learner.</p></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {saved && <p role="status" className="text-sm text-emerald-700">Saved to the learner profile. The learning path will use the new assignment.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium">Current confirmed level<select required value={current} onChange={(e)=>setCurrent(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm">{props.levels.map((l)=><option key={l.code} value={l.code}>{l.displayName} · {l.name}</option>)}</select></label>
      <label className="block text-xs font-medium">Target level<select value={target} onChange={(e)=>setTarget(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="">No target set</option>{props.levels.map((l)=><option key={l.code} value={l.code}>{l.displayName}</option>)}</select></label>
      <label className="block text-xs font-medium">Assigned course<select value={courseId} onChange={(e)=>setCourseId(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="">No additional course assignment</option>{props.courses.map((c)=><option key={c.id} value={c.id}>{c.title} · {c.levelName}</option>)}</select></label>
      <label className="block text-xs font-medium">Learning pace<select value={pace} onChange={(e)=>setPace(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="GENTLE">Gentle</option><option value="STANDARD">Standard</option><option value="INTENSIVE">Intensive</option></select></label>
      <label className="block text-xs font-medium">Daily goal (minutes)<input type="number" min={5} max={120} value={minutes} onChange={(e)=>setMinutes(Number(e.target.value))} className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="block text-xs font-medium sm:col-span-2">Reason for this change<input required minLength={8} maxLength={300} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Brief reason recorded for the learning plan change" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
    </div>
    <Button type="submit" disabled={busy || !current || !reason.trim()}>{busy ? "Saving…" : "Save learning plan"}</Button>
  </form>;
}
