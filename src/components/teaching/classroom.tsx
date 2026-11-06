"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export function ClassroomControls({
  sessionId,
  status,
  students,
  initialMarks,
}: {
  sessionId: string;
  status: string;
  students: { id: string; name: string; employeeCode: string | null }[];
  initialMarks: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marks, setMarks] = useState(initialMarks);
  const [note, setNote] = useState("");

  async function act(action: "start" | "end" | "cancel") {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/teaching/sessions/${sessionId}`, { method: "POST", body: { action } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not update the class.");
    } finally {
      setBusy(false);
    }
  }

  async function save(next: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/teaching/sessions/${sessionId}/attendance`, {
        method: "PUT",
        body: { marks: Object.entries(next).map(([studentId, status]) => ({ studentId, status })) },
      });
      setMarks(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save attendance.");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/teaching/notes", { method: "POST", body: { scope: "SESSION", sessionId, content: note.trim() } });
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  }

  const marked = Object.keys(marks).length;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {status === "SCHEDULED" && (
          <Button disabled={busy} onClick={() => act("start")}>Start class</Button>
        )}
        {status === "IN_PROGRESS" && (
          <Button disabled={busy} onClick={() => act("end")}>End class</Button>
        )}
        {status !== "COMPLETED" && status !== "CANCELLED" && (
          <Button variant="secondary" disabled={busy} onClick={() => act("cancel")}>Cancel class</Button>
        )}
      </div>

      <section aria-labelledby="attendance-heading" className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="attendance-heading" className="text-[15px] font-semibold">Attendance</h2>
          <p className="text-sm text-muted">
            <span className="font-semibold tabular-nums text-foreground">{marked}</span> of {students.length} marked
          </p>
        </div>
        {status === "SCHEDULED" ? (
          <p className="text-sm text-muted">Start the class before marking attendance. The start time is recorded by the server.</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted">No active students are in this group.</p>
        ) : (
          <>
            <div className="mb-3">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => save(Object.fromEntries(students.map((s) => [s.id, "PRESENT"])))}
              >
                Mark all present
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {students.map((student) => (
                <li key={student.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted">{student.employeeCode ?? "No employee code"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1" role="group" aria-label={`Attendance for ${student.name}`}>
                    {STATUSES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={busy}
                        aria-pressed={marks[student.id] === value}
                        onClick={() => save({ ...marks, [student.id]: value })}
                        className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          marks[student.id] === value ? "border-foreground bg-foreground text-surface" : "border-border text-muted"
                        }`}
                      >
                        {value === "PRESENT" ? "Present" : value === "ABSENT" ? "Absent" : value === "LATE" ? "Late" : "Excused"}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="note-heading" className="rounded-2xl border border-border bg-surface p-4">
        <h2 id="note-heading" className="mb-2 text-[15px] font-semibold">Class note</h2>
        <p className="mb-2 text-xs text-muted">Visible to teachers of this group. Students do not see it.</p>
        <label htmlFor="class-note" className="sr-only">Note</label>
        <textarea
          id="class-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <Button className="mt-2" variant="secondary" disabled={busy || !note.trim()} onClick={addNote}>Add note</Button>
      </section>

      <p className="text-xs text-muted">
        <Link href="/teacher/classes" className="underline">Back to schedule</Link>
      </p>
    </div>
  );
}
