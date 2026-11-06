"use client";

import { useEffect, useState } from "react";
import { BookOpen, Layers3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

type BookRow = {
  id: string; title: string; author: string | null; publisher: string | null; edition: string | null;
  isbn: string | null; language: string; levelCode: string | null; description: string | null;
  status: string; createdAt: string; _count: { nodes: number };
};
type LevelOption = { code: string; displayName: string | null };
type NodeRow = { id:string; parentId:string|null; nodeType:string; title:string; sortOrder:number; status:string };

export function BookCenter({ levels }: { levels: LevelOption[] }) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    try { const result=await apiFetch<{books:BookRow[]}>('/api/books'); setBooks(result.books); setError(''); }
    catch(e) { setError(e instanceof ApiClientError ? e.message : 'Could not load books.'); }
  }
  useEffect(()=>{void refresh()},[]);
  return <div className="mx-auto w-full max-w-5xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-primary">CONTENT · BOOKS</p><h1 className="mt-1 text-2xl font-bold">Books & course materials</h1><p className="mt-2 max-w-2xl text-sm text-muted">Create a flexible book record and build a chapter → unit → lesson → section → exercise tree. Book nodes can map to the existing LMS course, module, lesson and activity records. No third-party textbook content is fetched.</p></header>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <form className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2" onSubmit={async(e)=>{e.preventDefault();setBusy(true);setError('');setNotice('');const form=e.currentTarget;const fd=new FormData(form);try{const result=await apiFetch<{book:BookRow}>('/api/books',{method:'POST',body:{title:String(fd.get('title')),author:String(fd.get('author')||'')||null,publisher:String(fd.get('publisher')||'')||null,edition:String(fd.get('edition')||'')||null,isbn:String(fd.get('isbn')||'')||null,language:String(fd.get('language')||'en'),levelCode:String(fd.get('levelCode')||'')||null,description:String(fd.get('description')||'')||null}});setNotice(`Draft “${result.book.title}” created.`);form.reset();await refresh()}catch(err){setError(err instanceof ApiClientError?err.message:'Could not create the book.')}finally{setBusy(false)}}}>
      <div className="sm:col-span-2"><h2 className="text-sm font-semibold">Create a book record</h2><p className="mt-1 text-xs text-muted">Metadata only; educational material must be provided lawfully by your organization.</p></div>
      <label className="text-xs font-medium">Title<input required name="title" maxLength={180} placeholder="Book or material title" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="text-xs font-medium">Author<input name="author" maxLength={160} placeholder="Author (optional)" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="text-xs font-medium">Publisher<input name="publisher" maxLength={160} placeholder="Publisher (optional)" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="text-xs font-medium">Edition<input name="edition" maxLength={60} placeholder="Edition (optional)" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="text-xs font-medium">ISBN<input name="isbn" maxLength={32} placeholder="Optional" className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="text-xs font-medium">Language<input name="language" defaultValue="en" maxLength={12} className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <label className="text-xs font-medium">Level<select name="levelCode" defaultValue="" className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="">Not mapped yet</option>{levels.map(l=><option key={l.code} value={l.code}>{l.displayName??l.code}</option>)}</select></label>
      <label className="text-xs font-medium">Description<input name="description" maxLength={2000} className="mt-1 h-11 w-full rounded-lg border border-border px-3 text-sm" /></label>
      <div className="sm:col-span-2"><Button disabled={busy}><Plus className="mr-1 h-4 w-4"/>{busy?'Creating…':'Create draft book'}</Button></div>
    </form>
    <section><h2 className="mb-3 text-sm font-semibold">Books in your scope</h2>{books.length===0?<div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center"><BookOpen className="mx-auto h-8 w-8 text-muted"/><p className="mt-2 text-sm font-medium">No books yet</p><p className="mt-1 text-xs text-muted">A book appears here when one is created in your authorized organization.</p></div>:<div className="space-y-3">{books.map(b=><article key={b.id} className="rounded-2xl border border-border bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5"/></span><div><h3 className="font-semibold">{b.title}</h3><p className="mt-1 text-xs text-muted">{b.author??'Author not set'} · {b.levelCode??'Level not mapped'}</p></div></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">{b.status}</span></div><p className="mt-3 text-xs text-muted">{b.description??'No description yet.'}</p><div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted"><Layers3 className="h-4 w-4"/>{b._count.nodes} structure nodes <span className="ml-auto">{b.edition??'Draft record'}</span></div><BookTreeEditor bookId={b.id}/></article>)}</div>}</section>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><b>Import status:</b> database schema supports versioned book metadata, structured nodes and mappings. CSV/XLSX bulk-import preview and a formal content-rights approval workflow are not yet configured; use individual original content or organization-authorized materials only.</div>
  </div>;
}

function BookTreeEditor({bookId}:{bookId:string}) {
  const [nodes,setNodes]=useState<NodeRow[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){try{const r=await apiFetch<{nodes:NodeRow[]}>(`/api/books/${bookId}/nodes`);setNodes(r.nodes);setError('')}catch(e){setError(e instanceof ApiClientError?e.message:'Could not load structure.')}}
  useEffect(()=>{void refresh()},[bookId]);
  return <details className="mt-4 border-t border-border pt-3"><summary className="cursor-pointer text-xs font-semibold text-primary">Edit book structure ({nodes.length})</summary><div className="mt-3 space-y-3">
    {nodes.length>0&&<ol className="space-y-1">{nodes.map(n=><li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs" style={{marginLeft:n.parentId?14:0}}><span className="mr-2 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{n.nodeType}</span>{n.title}<span className="ml-2 text-muted">{n.status}</span></li>)}</ol>}
    {nodes.length===0&&<p className="text-xs text-muted">No structure nodes yet. Start with a chapter or unit.</p>}
    {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
    <form className="grid gap-2 sm:grid-cols-4" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);setBusy(true);setError('');try{await apiFetch(`/api/books/${bookId}/nodes`,{method:'POST',body:{nodeType:String(fd.get('nodeType')),title:String(fd.get('title')),sortOrder:Number(fd.get('sortOrder')||nodes.length),parentId:String(fd.get('parentId')||'')||null}});form.reset();await refresh()}catch(err){setError(err instanceof ApiClientError?err.message:'Could not add the structure node.')}finally{setBusy(false)}}}>
      <select name="nodeType" className="h-10 rounded-lg border border-border bg-white px-2 text-xs"><option>CHAPTER</option><option>UNIT</option><option>LESSON</option><option>SECTION</option><option>EXERCISE</option><option>QUIZ</option></select>
      <input required name="title" maxLength={180} placeholder="Node title" className="h-10 rounded-lg border border-border px-2 text-xs" />
      <select name="parentId" defaultValue="" className="h-10 rounded-lg border border-border bg-white px-2 text-xs"><option value="">No parent</option>{nodes.map(n=><option key={n.id} value={n.id}>{n.nodeType}: {n.title}</option>)}</select>
      <Button size="sm" disabled={busy}>{busy?'Adding…':'Add structure node'}</Button>
    </form>
  </div></details>;
}
