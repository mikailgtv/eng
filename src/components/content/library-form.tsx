"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function LibraryForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="mt-4 space-y-2 text-sm" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        await apiFetch("/api/content/library", { method: "POST", body: { kind: data.get("kind"), title: data.get("title"), body: data.get("body"), levelCode: data.get("levelCode"), difficulty: data.get("difficulty"), topic: data.get("topic"), primarySkill: data.get("primarySkill"), tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean), aiLabeled: data.get("ai") === "on" } });
        setMessage("Saved in the library as a draft.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Not saved.");
      }
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="kind" className="h-11 rounded-lg border border-border px-2">
          {["VOCABULARY", "GRAMMAR", "READING", "LISTENING", "SPEAKING", "WRITING", "EXERCISE", "AI_CONTENT", "DOCUMENT"].map((kind) => <option key={kind}>{kind}</option>)}
        </select>
        <input name="title" placeholder="Title" className="h-11 rounded-lg border border-border px-2" required />
        <input name="levelCode" placeholder="Academic level, such as PRE_A1" className="h-11 rounded-lg border border-border px-2" />
        <select name="difficulty" className="h-11 rounded-lg border border-border px-2">
          <option value="">Difficulty tag</option>
          <option value="VERY_EASY">Very easy</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
        </select>
        <input name="topic" placeholder="Topic, such as Safety" className="h-11 rounded-lg border border-border px-2" />
        <select name="primarySkill" className="h-11 rounded-lg border border-border px-2">
          {["VOCABULARY", "GRAMMAR", "READING", "WRITING", "LISTENING", "SPEAKING"].map((skill) => <option key={skill}>{skill}</option>)}
        </select>
      </div>
      <textarea name="body" placeholder="Body or translation" className="min-h-20 w-full rounded-lg border border-border p-2" />
      <input name="tags" placeholder="Tags, separated by commas" className="h-11 w-full rounded-lg border border-border px-2" />
      <label className="flex gap-2"><input type="checkbox" name="ai" />Label as AI draft</label>
      <Button type="submit" className="h-11">Save to library</Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
