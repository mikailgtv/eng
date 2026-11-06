"use client";
import { useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
type Level={id:string;code:string;name:string;displayName:string;order:number;organizationId:string|null;allowLowerLevelReview:boolean;allowAssignedHigherPreview:boolean;requireExplicitAssignment:boolean};
export function LevelCatalogAdmin({initial}:{initial:Level[]}){
 const [rows,setRows]=useState(initial),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function reload(){const result=await apiFetch<{levels:Level[]}>('/api/admin/learning-levels');setRows(result.levels)}
 return <div className="mx-auto max-w-5xl space-y-6">
  <header><p className="text-xs font-bold uppercase tracking-widest text-primary">ORGANIZATION · LEARNING CONFIGURATION</p><h1 className="mt-1 text-2xl font-bold">Language levels & access</h1><p className="mt-2 max-w-2xl text-sm text-muted">Standard CEFR levels stay platform-wide. Organization-specific names and custom levels are scoped to this tenant. Higher-level courses require explicit teacher assignment; level promotion remains a human decision.</p></header>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  <form className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-4" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);setBusy(true);setError('');setNotice('');try{await apiFetch('/api/admin/learning-levels',{method:'POST',body:{kind:'CUSTOM',code:String(fd.get('code')),name:String(fd.get('name')),displayName:String(fd.get('displayName')),description:String(fd.get('description')||'')}});setNotice('Organization level created. It is now available for profiles and content.');form.reset();await reload()}catch(err){setError(err instanceof ApiClientError?err.message:'Could not create custom level.')}finally{setBusy(false)}}}>
   <div className="sm:col-span-4"><h2 className="text-sm font-semibold">Add custom organization level</h2></div>
   <label className="text-xs font-medium">Code<input required name="code" maxLength={30} placeholder="FOUNDATION" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm"/></label>
   <label className="text-xs font-medium">Internal name<input required name="name" maxLength={80} placeholder="Foundation" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm"/></label>
   <label className="text-xs font-medium">Student label<input required name="displayName" maxLength={80} placeholder="Level 0 · Foundation" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm"/></label>
   <label className="text-xs font-medium">Description<input name="description" maxLength={500} className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm"/></label>
   <div className="sm:col-span-4"><Button disabled={busy}>{busy?'Saving…':'Create custom level'}</Button></div>
  </form>
  <section className="space-y-3"><h2 className="text-sm font-semibold">Active level catalog</h2>{rows.map(level=><LevelPolicyCard key={level.id} level={level} onSaved={async()=>{setNotice(`Policy saved for ${level.code}.`);await reload()}} onError={setError}/>)}</section>
 </div>
}
function LevelPolicyCard({level,onSaved,onError}:{level:Level;onSaved:()=>void;onError:(s:string)=>void}){
 const [name,setName]=useState(level.name),[display,setDisplay]=useState(level.displayName),[review,setReview]=useState(level.allowLowerLevelReview),[preview,setPreview]=useState(level.allowAssignedHigherPreview),[explicit,setExplicit]=useState(level.requireExplicitAssignment),[busy,setBusy]=useState(false);
 return <form className="rounded-2xl border border-border bg-white p-4" onSubmit={async e=>{e.preventDefault();setBusy(true);onError('');try{await apiFetch('/api/admin/learning-levels',{method:'POST',body:{kind:'POLICY',levelCode:level.code,nameOverride:name===level.name?'':name,displayNameOverride:display===level.displayName?'':display,allowLowerLevelReview:review,allowAssignedHigherPreview:preview,requireExplicitAssignment:explicit}});onSaved()}catch(err){onError(err instanceof ApiClientError?err.message:'Could not save level policy.')}finally{setBusy(false)}}}>
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{level.displayName}</h3><p className="text-xs text-muted">{level.code} · order {level.order} · {level.organizationId?'Organization custom level':'Shared CEFR level'}</p></div><Button size="sm" variant="secondary" disabled={busy}>{busy?'Saving…':'Save policy'}</Button></div>
  <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs">Organization name override<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm"/></label><label className="text-xs">Student-facing label<input value={display} onChange={e=>setDisplay(e.target.value)} maxLength={80} className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm"/></label></div>
  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={review} onChange={e=>setReview(e.target.checked)}/>Allow review of lower levels</label><label className="flex items-center gap-2"><input type="checkbox" checked={preview} onChange={e=>setPreview(e.target.checked)}/>Allow explicitly assigned higher-level preview</label><label className="flex items-center gap-2"><input type="checkbox" checked={explicit} onChange={e=>setExplicit(e.target.checked)}/>Require explicit higher-level assignment</label></div>
 </form>
}
