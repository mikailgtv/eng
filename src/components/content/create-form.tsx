"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ContentCreateForm({ levels, curricula, admin }: { levels: { id: string; name: string }[]; curricula: { id: string; title: string }[]; admin: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {admin && (
        <form className="space-y-2 rounded-2xl border border-border p-3 text-sm" onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
            await apiFetch("/api/content/curricula", { method: "POST", body: { title: data.get("title"), goal: data.get("goal"), levelCode: data.get("levelCode"), durationWeeks: Number(data.get("durationWeeks") || 0) || null, sessionCount: Number(data.get("sessionCount") || 0) || null, plannedHours: Number(data.get("plannedHours") || 0) || null } });
            setMessage("Curriculum saved as a draft.");
            router.refresh();
          } catch (err) {
            setMessage(err instanceof ApiClientError ? err.message : "Not saved.");
          }
        }}>
          <h2 className="font-semibold">New curriculum</h2>
          <input name="title" placeholder="Title" className="h-11 w-full rounded-lg border border-border px-2" required />
          <input name="goal" placeholder="Goal" className="h-11 w-full rounded-lg border border-border px-2" />
          <input name="levelCode" placeholder="Level code, such as PRE_A1" className="h-11 w-full rounded-lg border border-border px-2" />
          <input name="durationWeeks" type="number" placeholder="Weeks" className="h-11 w-full rounded-lg border border-border px-2" />
          <input name="sessionCount" type="number" placeholder="Sessions" className="h-11 w-full rounded-lg border border-border px-2" />
          <input name="plannedHours" type="number" placeholder="Hours" className="h-11 w-full rounded-lg border border-border px-2" />
          <Button type="submit" className="h-11">Create curriculum</Button>
        </form>
      )}
      <form className="space-y-2 rounded-2xl border border-border p-3 text-sm" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const course = await apiFetch<{ id: string }>("/api/content/courses", { method: "POST", body: { title: data.get("title"), levelId: data.get("levelId"), curriculumId: data.get("curriculumId") || null, goal: data.get("goal"), outcomes: data.get("outcomes") } });
          setMessage("Course draft created.");
          router.push(`/teacher/content/course/${course.id}`);
        } catch (err) {
          setMessage(err instanceof ApiClientError ? err.message : "Not saved.");
        }
      }}>
        <h2 className="font-semibold">New course</h2>
        <input name="title" placeholder="Title" className="h-11 w-full rounded-lg border border-border px-2" required />
        <textarea name="goal" placeholder="Learning goal" className="min-h-16 w-full rounded-lg border border-border p-2" />
        <textarea name="outcomes" placeholder="Learning outcomes" className="min-h-16 w-full rounded-lg border border-border p-2" />
        <select name="levelId" className="h-11 w-full rounded-lg border border-border px-2" required>
          {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
        </select>
        <select name="curriculumId" className="h-11 w-full rounded-lg border border-border px-2">
          <option value="">No curriculum yet</option>
          {curricula.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <Button type="submit" className="h-11">Create course draft</Button>
      </form>
      {message && <p className="text-sm lg:col-span-2" role="status">{message}</p>}
    </div>
  );
}
