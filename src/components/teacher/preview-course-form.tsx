"use client";
import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
export function PreviewCourseForm({studentId,courses}:{studentId:string;courses:{id:string;title:string;levelName:string}[]}){
 const [courseId,setCourseId]=useState(courses[0]?.id??''),[error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 if(!courses.length)return null;
 return <form className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-3" onSubmit={async(e)=>{e.preventDefault();setError('');setSaved(false);setBusy(true);try{await apiFetch(`/api/teaching/students/${studentId}/course-preview`,{method:'POST',body:{courseId}});setSaved(true)}catch(err){setError(err instanceof ApiClientError?err.message:'Could not assign course preview.')}finally{setBusy(false)}}}>
  <label className="min-w-[220px] flex-1 text-xs font-medium">Optional next-level preview<select value={courseId} onChange={e=>setCourseId(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-2 text-sm">{courses.map(c=><option value={c.id} key={c.id}>{c.title} · {c.levelName}</option>)}</select></label>
  <Button type="submit" variant="secondary" size="sm" disabled={busy}>{busy?'Assigning…':'Grant preview access'}</Button>
  {saved&&<span role="status" className="text-xs text-emerald-700">Preview access saved.</span>}{error&&<span role="alert" className="text-xs text-red-700">{error}</span>}
 </form>
}
