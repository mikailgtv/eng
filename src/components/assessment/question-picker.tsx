"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { QUESTION_TYPE_LABELS } from "@/lib/assessment/registry";

interface BankQuestion {
  id: string;
  type: string;
  questionText: string;
  difficulty: string;
  skill: string | null;
  points: number;
  lessonTitle: string | null;
}

interface SelectedQuestion {
  questionId: string;
  points: number;
  questionText: string;
  type: string;
}

/**
 * Explicit question selection for one assessment: search the bank, add,
 * reorder, set per-assessment points, save. Never loads the whole bank —
 * search results are paginated.
 */
export function QuestionPicker({
  assessmentId,
  initialSelected,
}: {
  assessmentId: string;
  initialSelected: SelectedQuestion[];
}) {
  const [selected, setSelected] = useState<SelectedQuestion[]>(initialSelected);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [results, setResults] = useState<BankQuestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    setSearching(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ pageSize: "10", status: "PUBLISHED" });
      if (search.trim()) sp.set("q", search.trim());
      if (typeFilter) sp.set("type", typeFilter);
      const data = await apiFetch<{ questions: BankQuestion[] }>(`/api/questions?${sp.toString()}`);
      setResults(data.questions);
      setSearched(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }, [search, typeFilter]);

  // Debounced live search.
  useEffect(() => {
    const id = setTimeout(() => void runSearch(), 350);
    return () => clearTimeout(id);
  }, [runSearch]);

  function addQuestion(q: BankQuestion) {
    if (selected.some((s) => s.questionId === q.id)) return;
    setSelected((s) => [...s, { questionId: q.id, points: q.points, questionText: q.questionText, type: q.type }]);
  }
  function remove(questionId: string) {
    setSelected((s) => s.filter((x) => x.questionId !== questionId));
  }
  function move(index: number, dir: -1 | 1) {
    setSelected((s) => {
      const next = [...s];
      const j = index + dir;
      if (j < 0 || j >= next.length) return s;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }
  function setPoints(questionId: string, points: number) {
    setSelected((s) => s.map((x) => (x.questionId === questionId ? { ...x, points } : x)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/assessments/${assessmentId}/questions`, {
        method: "PUT",
        body: { questions: selected.map((s) => ({ questionId: s.questionId, points: s.points })) },
      });
      setMessage("Question list saved.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save the question list.");
    } finally {
      setBusy(false);
    }
  }

  const selectedIds = new Set(selected.map((s) => s.questionId));
  const totalPoints = selected.reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="space-y-6">
      {/* Selected questions (ordered) */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Questions in this assessment <span className="font-normal text-muted">({selected.length} · {totalPoints} points)</span>
          </p>
          <Button size="sm" onClick={save} loading={busy} disabled={selected.length === 0}>
            <Check className="h-4 w-4" aria-hidden /> Save list
          </Button>
        </div>
        {message && <p className="mb-2 text-[13px] text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mb-2 text-[13px] text-danger">{error}</p>}
        {selected.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-[13px] text-muted">
            No questions yet — search the bank below and add questions.
          </p>
        ) : (
          <ol className="space-y-2">
            {selected.map((s, i) => (
              <li key={s.questionId} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground" dir="auto">
                    {s.questionText}
                  </span>
                  <span className="block text-xs text-muted">{QUESTION_TYPE_LABELS[s.type as keyof typeof QUESTION_TYPE_LABELS] ?? s.type}</span>
                </span>
                <label className="shrink-0 text-xs text-muted">
                  pts
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={s.points}
                    onChange={(e) => setPoints(s.questionId, Math.max(1, Number(e.target.value) || 1))}
                    className="ml-1.5 h-8 w-16 px-2 text-sm"
                  />
                </label>
                <div className="flex shrink-0 flex-col">
                  <button type="button" aria-label={`Move question ${i + 1} up`} onClick={() => move(i, -1)} disabled={i === 0} className="text-muted hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label={`Move question ${i + 1} down`} onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="text-muted hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => remove(s.questionId)} className="shrink-0 text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Bank search */}
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Search className="h-4 w-4 text-muted" aria-hidden /> Question bank
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by text…"
            aria-label="Search the question bank"
          />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type" className="sm:w-48">
            <option value="">All types</option>
            {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>

        <ul className="mt-3 space-y-2">
          {results.map((q) => {
            const added = selectedIds.has(q.id);
            return (
              <li key={q.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground" dir="auto">
                    {q.questionText}
                  </span>
                  <span className="block text-xs text-muted">
                    {QUESTION_TYPE_LABELS[q.type as keyof typeof QUESTION_TYPE_LABELS] ?? q.type} ·{" "}
                    {q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()} · {q.points} pt
                    {q.lessonTitle ? ` · ${q.lessonTitle}` : ""}
                  </span>
                </span>
                <Button size="sm" variant={added ? "secondary" : "subtle"} onClick={() => addQuestion(q)} disabled={added}>
                  <Plus className="h-4 w-4" aria-hidden /> {added ? "Added" : "Add"}
                </Button>
              </li>
            );
          })}
          {searched && !searching && results.length === 0 && (
            <li className="px-1 py-2 text-[13px] text-muted">No published questions match. Create some in the Question Bank.</li>
          )}
          {searching && <li className="px-1 py-2 text-[13px] text-muted">Searching…</li>}
        </ul>
      </div>
    </div>
  );
}
