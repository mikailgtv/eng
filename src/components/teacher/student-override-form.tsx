"use client";

import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function StudentOverrideForm({studentId}:{studentId:string}) {
 const [error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 return <form className="mt-5 space-y-3 rounded-2xl border border-border bg-white p-4" onSubmit={async(e)=>{e.preventDefault();setError('');setSaved(false);setBusy(true);const fd=new FormData(e.currentTarget);try{await apiFetch('/api/adaptive/overrides',{method:'POST',body:{studentId,prioritySkill:String(fd.get('skill')),requiredLabel:String(fd.get('label')),note:String(fd.get('reason')),reason:String(fd.get('reason')),durationDays:Number(fd.get('duration'))}});setSaved(true);e.currentTarget.reset()}catch(err){setError(err instanceof ApiClientError?err.message:'Could not save the teacher override.')}finally{setBusy(false)}}}>
  <div><h2 className="text-sm font-semibold">Teacher override · focus for this student</h2><p className="mt-1 text-xs text-muted">This adds a prioritized practice recommendation for the chosen duration; it does not change an official grade or assessment.</p></div>
  {error&&<p role="alert" className="text-sm text-danger">{error}</p>}{saved&&<p role="status" className="text-sm text-emerald-700">Override saved. The plan refreshes from this student’s recorded learning data.</p>}
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-medium">Priority skill<select name="skill" className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="listening">Listening</option><option value="speaking">Speaking</option><option value="vocabulary">Vocabulary</option><option value="grammar">Grammar</option><option value="reading">Reading</option><option value="writing">Writing</option></select></label>
   <label className="text-xs font-medium">Duration<select name="duration" defaultValue="7" className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="1">1 day</option><option value="7">1 week</option><option value="14">2 weeks</option><option value="30">1 month</option><option value="90">3 months</option></select></label>
   <label className="text-xs font-medium sm:col-span-2">Practice focus<input required name="label" maxLength={80} placeholder="For example: listening for key details" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm"/></label>
   <label className="text-xs font-medium sm:col-span-2">Reason<input required minLength={8} name="reason" maxLength={200} placeholder="Why this focus is useful for the learner" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm"/></label>
  </div>
  <Button disabled={busy}>{busy?'Saving…':'Save teacher override'}</Button>
 </form>;
}
