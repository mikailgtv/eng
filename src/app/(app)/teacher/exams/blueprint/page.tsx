"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BlueprintBuilderPage() {
  const [title, setTitle] = useState("Level Final Assessment Blueprint");
  const [type, setType] = useState("FINAL");
  const [count, setCount] = useState(20);
  const [passing, setPassing] = useState(70);
  const [secureMode, setSecureMode] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<any>(null);

  const sections = [
    { skill: "VOCABULARY", percent: 30 },
    { skill: "GRAMMAR", percent: 25 },
    { skill: "LISTENING", percent: 20 },
    { skill: "READING", percent: 15 },
    { skill: "WRITING", percent: 5 },
    { skill: "SPEAKING", percent: 5 },
  ];
  const difficulty = { EASY: 60, MEDIUM: 30, HARD: 10 };

  async function testValidation(only = true) {
    setLoading(true);
    try {
      const res = await fetch("/api/assessments/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          assessmentType: type,
          questionCount: Number(count),
          passingScore: Number(passing),
          sections,
          difficulty,
          secureMode,
          validateOnly: only,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed");
      if (only) setCheckResult(data.data);
      else setCreated(data.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link href="/teacher/exams" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assessments
      </Link>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Assessment Blueprint Builder</h1>
        <p className="text-sm text-muted">Define balanced skill coverage, difficulty mix, and validate against available question pools.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-sm">Blueprint Configuration</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">Title</label>
            <input className="w-full rounded-lg border border-border bg-surface p-2 text-sm mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="text-xs font-medium text-muted">Type</label>
              <select className="w-full rounded-lg border border-border bg-surface p-2 mt-1" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="FINAL">Final assessment</option>
                <option value="EXAM">Official exam</option>
                <option value="DIAGNOSTIC">Diagnostic test</option>
                <option value="PLACEMENT">Placement test</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Total Questions</label>
              <input type="number" className="w-full rounded-lg border border-border bg-surface p-2 mt-1" value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Passing score (%)</label>
              <input type="number" className="w-full rounded-lg border border-border bg-surface p-2 mt-1" value={passing} onChange={(e) => setPassing(Number(e.target.value))} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input type="checkbox" checked={secureMode} onChange={(e) => setSecureMode(e.target.checked)} />
            Enable secure exam mode signals (visibility change, tab switch indicators)
          </label>

          <div className="rounded-lg border border-border bg-muted/5 p-3 text-xs space-y-1">
            <p className="font-semibold text-foreground">Configured Skill Distribution</p>
            <p className="text-muted">Vocabulary 30% · Grammar 25% · Listening 20% · Reading 15% · Writing 5% · Speaking 5%</p>
            <p className="font-semibold text-foreground mt-2">Configured Difficulty Distribution</p>
            <p className="text-muted">Easy 60% · Medium 30% · Hard 10%</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" disabled={loading} onClick={() => testValidation(true)}>
              <Sparkles className="h-4 w-4" /> Check blueprint feasibility
            </Button>
            <Button disabled={loading} onClick={() => testValidation(false)}>
              Save blueprint
            </Button>
          </div>
        </CardBody>
      </Card>

      {checkResult && (
        <Card className={checkResult.satisfied ? "border-emerald-300 bg-emerald-50/20" : "border-amber-300 bg-amber-50/20"}>
          <CardBody className="p-4 text-xs space-y-2">
            <div className="flex items-center gap-2">
              {checkResult.satisfied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
              <span className="font-semibold text-sm">{checkResult.message}</span>
            </div>
            {checkResult.missing?.length > 0 && (
              <ul className="list-disc pl-5 text-amber-900 space-y-0.5">
                {checkResult.missing.map((msg: string, i: number) => <li key={i}>{msg}</li>)}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {created && (
        <Card className="border-emerald-500 bg-emerald-50/30">
          <CardBody className="p-4 text-xs space-y-1">
            <p className="font-semibold text-emerald-800 text-sm">Blueprint saved successfully (ID: {created.blueprint.id})</p>
            <p className="text-muted">Status: {created.blueprint.status}. Initial version 1 created with immutable sections.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
