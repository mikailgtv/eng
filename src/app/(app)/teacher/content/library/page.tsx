import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { searchLibrary } from "@/lib/content/library";
import { LibraryForm } from "@/components/content/library-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Content library" };

export default async function LibraryPage({ searchParams: rawSearchParams }: { searchParams: Promise<{ q?: string; kind?: string; level?: string; topic?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  await requirePageUser(["TEACHER", "ADMIN"]);
  const result = await searchLibrary({ q: searchParams.q, kind: searchParams.kind, level: searchParams.level, topic: searchParams.topic, take: 20 });
  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-sm"><Link className="underline" href="/teacher/content">Content builder</Link></p>
      <h1 className="mt-1 text-xl font-semibold">Content library</h1>
      <p className="mt-1 text-sm text-muted">Reusable items. A change does not silently rewrite every lesson; each use is a reference.</p>
      <LibraryForm />
      <form className="mt-4 grid gap-2 text-sm sm:grid-cols-4" action="/teacher/content/library">
        <input name="q" defaultValue={searchParams.q} placeholder="Search" className="h-11 rounded-lg border border-border px-2" />
        <input name="kind" defaultValue={searchParams.kind} placeholder="Kind" className="h-11 rounded-lg border border-border px-2" />
        <input name="level" defaultValue={searchParams.level} placeholder="Level" className="h-11 rounded-lg border border-border px-2" />
        <input name="topic" defaultValue={searchParams.topic} placeholder="Topic" className="h-11 rounded-lg border border-border px-2" />
        <button className="h-11 rounded-lg border border-border px-3 sm:col-span-4" type="submit">Filter</button>
      </form>
      <ul className="mt-4 space-y-2 text-sm">
        {result.items.map((item) => (
          <li key={item.id} className="rounded-xl border border-border px-3 py-2">
            <span className="font-medium">{item.title}</span>
            <span className="mt-1 block text-muted">{item.kind} · {item.levelCode ?? "No level"} · {item.difficulty ?? "No difficulty"} · {item.usageCount} uses · {item.author}{item.aiLabeled ? " · AI draft" : ""}</span>
          </li>
        ))}
        {result.items.length === 0 && <li className="text-muted">No matching content.</li>}
      </ul>
    </div>
  );
}
