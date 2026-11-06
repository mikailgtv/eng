"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function StructureForm({ courseId, modules, lessons, groups }: { courseId: string; modules: { id: string; title: string }[]; lessons: { id: string; title: string }[]; groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  async function send(body: Record<string, unknown>) {
    try {
      await apiFetch("/api/content/structure", { method: "POST", body });
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiClientError ? err.message : "Not saved.");
    }
  }
  return (
    <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
      <form className="space-y-2 rounded-xl border border-border p-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void send({ action: "module", courseId, title: data.get("title"), goal: data.get("goal") }); }}>
        <h2 className="font-semibold">Module</h2>
        <input name="title" placeholder="Module title" className="h-11 w-full rounded-lg border border-border px-2" required />
        <input name="goal" placeholder="Module goal" className="h-11 w-full rounded-lg border border-border px-2" />
        <Button className="h-11" type="submit">Add module</Button>
      </form>
      <form className="space-y-2 rounded-xl border border-border p-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void send({ action: "unit", moduleId, title: data.get("title"), goal: data.get("goal") }); }}>
        <h2 className="font-semibold">Unit</h2>
        <select className="h-11 w-full rounded-lg border border-border px-2" value={moduleId} onChange={(event) => setModuleId(event.target.value)}>
          {modules.map((mod) => <option key={mod.id} value={mod.id}>{mod.title}</option>)}
        </select>
        <input name="title" placeholder="Unit title" className="h-11 w-full rounded-lg border border-border px-2" required />
        <input name="goal" placeholder="Unit goal" className="h-11 w-full rounded-lg border border-border px-2" />
        <Button className="h-11" type="submit">Add unit</Button>
      </form>
      <form className="space-y-2 rounded-xl border border-border p-3" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          const lesson = await apiFetch<{ id: string }>("/api/content/lessons", { method: "POST", body: { action: "create", moduleId: data.get("moduleId"), title: data.get("title"), beginnerMode: data.get("beginner") === "on", difficulty: data.get("difficulty") } });
          router.push(`/teacher/content/builder/${lesson.id}`);
        } catch (err) {
          setMessage(err instanceof ApiClientError ? err.message : "Lesson was not created.");
        }
      }}>
        <h2 className="font-semibold">Lesson</h2>
        <select name="moduleId" className="h-11 w-full rounded-lg border border-border px-2">{modules.map((mod) => <option key={mod.id} value={mod.id}>{mod.title}</option>)}</select>
        <input name="title" placeholder="Lesson title" className="h-11 w-full rounded-lg border border-border px-2" required />
        <select name="difficulty" className="h-11 w-full rounded-lg border border-border px-2">
          <option value="">Difficulty tag</option>
          <option value="VERY_EASY">Very easy</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
          <option value="VERY_HARD">Very hard</option>
        </select>
        <label className="flex gap-2"><input type="checkbox" name="beginner" />Pre-A1 short-text mode</label>
        <Button className="h-11" type="submit">Add lesson</Button>
      </form>
      <form className="space-y-2 rounded-xl border border-border p-3" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
          await apiFetch("/api/content/assign", { method: "POST", body: { resourceType: "COURSE", resourceId: courseId, targetType: "GROUP", targetId: data.get("groupId"), confirm: true } });
          setMessage("Assigned to the group. Students in that group are notified.");
        } catch (err) {
          setMessage(err instanceof ApiClientError ? err.message : "Not assigned.");
        }
      }}>
        <h2 className="font-semibold">Assign course</h2>
        <select name="groupId" className="h-11 w-full rounded-lg border border-border px-2">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
        <Button className="h-11" type="submit">Assign</Button>
      </form>
      {lessons[0] && (
        <form className="space-y-2 rounded-xl border border-border p-3 lg:col-span-2" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void send({ action: "prerequisite", resourceType: "LESSON", resourceId: data.get("lessonId"), requiredType: "LESSON", requiredId: data.get("requiredId") });
        }}>
          <h2 className="font-semibold">Lesson prerequisite</h2>
          <select name="lessonId" className="h-11 w-full rounded-lg border border-border px-2">{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select>
          <select name="requiredId" className="h-11 w-full rounded-lg border border-border px-2">{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select>
          <Button className="h-11" type="submit">Save prerequisite</Button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
