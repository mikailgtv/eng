"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { EMPTY_RULES, type CompletionRules } from "@/lib/certificates/rules";

type CourseOption = { id: string; title: string; groupIds: string[]; rules: CompletionRules | null };
type Person = { id: string; name: string; groupId: string | null; status: string };
type Group = { id: string; name: string };
type Cert = { publicId: string; status: string; studentName: string; courseTitle: string };

export function PreferenceForm({ initial }: { initial: { notifyEligible: boolean; notifyIssued: boolean; notifyRevoked: boolean; notifyExpiring: boolean } }) {
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form className="space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      try {
        await apiFetch("/api/certificates/preferences", { method: "POST", body: value });
        setMessage("Notification choices saved.");
      } catch (err) {
        setMessage(err instanceof ApiClientError ? err.message : "Could not save.");
      }
    }}>
      <Check label="Tell me when requirements are complete" checked={value.notifyEligible} onChange={(notifyEligible) => setValue({ ...value, notifyEligible })} />
      <Check label="Tell me when a certificate is issued" checked={value.notifyIssued} onChange={(notifyIssued) => setValue({ ...value, notifyIssued })} />
      <Check label="Tell me if a certificate is revoked" checked={value.notifyRevoked} onChange={(notifyRevoked) => setValue({ ...value, notifyRevoked })} />
      <Check label="Tell me before a certificate expires" checked={value.notifyExpiring} onChange={(notifyExpiring) => setValue({ ...value, notifyExpiring })} />
      <Button type="submit">Save notification choices</Button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}

export function PreviewButton({ courseId, studentId }: { courseId: string; studentId?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <Button type="button" variant="secondary" onClick={async () => {
        setMessage(null);
        const response = await fetch("/api/certificates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, studentId }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setMessage(payload?.error ?? "Preview failed. Nothing was issued.");
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
        setMessage("Preview opened. This is not a certificate and no certificate ID was assigned.");
      }}>Preview only — this does not issue a certificate</Button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}

export function ApprovalForm({ students, courses }: { students: { id: string; name: string }[]; courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [kind, setKind] = useState("SPEAKING");
  const [status, setStatus] = useState("APPROVED");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (students.length === 0 || courses.length === 0) return <p className="text-sm text-muted">No assigned student or course is available for approval.</p>;
  return (
    <form className="space-y-3" onSubmit={(event) => submit(event, "/api/certificates/approvals", { studentId, courseId, kind, status, note, reason, confirm }, setMessage, router)}>
      <Select label="Student" value={studentId} onChange={setStudentId} options={students.map((student) => ({ value: student.id, label: student.name }))} />
      <Select label="Course" value={courseId} onChange={setCourseId} options={courses.map((course) => ({ value: course.id, label: course.title }))} />
      <Select label="Kind" value={kind} onChange={setKind} options={[{ value: "SPEAKING", label: "Speaking" }, { value: "WRITING", label: "Writing" }, { value: "PROJECT", label: "Project" }]} />
      <Select label="Decision" value={status} onChange={setStatus} options={[{ value: "APPROVED", label: "Approved" }, { value: "NEEDS_REVISION", label: "Needs revision" }]} />
      <Field label="Note for the student" value={note} onChange={setNote} />
      <Field label="Reason for the audit record" value={reason} onChange={setReason} />
      <Check label="I confirm this official approval" checked={confirm} onChange={setConfirm} />
      <Button type="submit">Save approval</Button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}

export function AdminCertificateForms({ courses, students, groups, certificates }: { courses: CourseOption[]; students: Person[]; groups: Group[]; certificates: Cert[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const [rules, setRules] = useState<CompletionRules>(course?.rules ?? EMPTY_RULES);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [publicId, setPublicId] = useState(certificates[0]?.publicId ?? "");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [requirementKey, setRequirementKey] = useState("lessons");
  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl border border-border px-3 py-2 text-sm" role="status">{message}</p>}
      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-base font-semibold">Completion rule</h2>
        <p className="mt-1 text-sm text-muted">Each course has its own rule. Practice, XP, and the AI tutor cannot be added.</p>
        <div className="mt-3 space-y-3">
          <Select label="Course" value={courseId} onChange={(value) => { setCourseId(value); setRules(courses.find((item) => item.id === value)?.rules ?? EMPTY_RULES); }} options={courses.map((item) => ({ value: item.id, label: item.title }))} />
          <RuleEditor rules={rules} onChange={setRules} />
          <Check label="I confirm this official rule change" checked={confirm} onChange={setConfirm} />
          <Button type="button" onClick={() => post("/api/certificates/rules", { courseId, rules, confirm }, setMessage, router)}>Save rule</Button>
        </div>
      </section>
      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-base font-semibold">Issue one certificate</h2>
        <p className="mt-1 text-sm text-muted">Issuance fails if the student is not eligible or the PDF, QR, template, or signatory check fails.</p>
        <div className="mt-3 space-y-3">
          <Select label="Student" value={studentId} onChange={setStudentId} options={students.map((student) => ({ value: student.id, label: `${student.name}${student.status === "INACTIVE" ? " (deactivated)" : ""}` }))} />
          <Select label="Course" value={courseId} onChange={setCourseId} options={courses.map((item) => ({ value: item.id, label: item.title }))} />
          <Field label="Reason" value={reason} onChange={setReason} />
          <Check label="I confirm this official issuance" checked={confirm} onChange={setConfirm} />
          <Button type="button" onClick={() => post("/api/certificates/issue", { studentId, courseId, reason, confirm }, setMessage, router)}>Issue certificate</Button>
        </div>
      </section>
      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-base font-semibold">Batch issuance</h2>
        <p className="mt-1 text-sm text-muted">Every student is checked. An ineligible student is reported and does not receive a certificate.</p>
        <div className="mt-3 space-y-3">
          <Select label="Group" value={groupId} onChange={setGroupId} options={groups.map((group) => ({ value: group.id, label: group.name }))} />
          <Field label="Reason" value={reason} onChange={setReason} />
          <Check label="I confirm this official batch" checked={confirm} onChange={setConfirm} />
          <Button type="button" variant="secondary" onClick={() => post("/api/certificates/batch", { groupId, courseId, reason, confirm }, setMessage, router)}>Check and issue eligible students</Button>
        </div>
      </section>
      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-base font-semibold">Waive one requirement</h2>
        <p className="mt-1 text-sm text-muted">This does not change an exam attempt, attendance mark, or assignment score. The waiver stays visible.</p>
        <div className="mt-3 space-y-3">
          <Select label="Requirement" value={requirementKey} onChange={setRequirementKey} options={["lessons", "assignments", "exams", "quizzes", "attendance", "speaking", "listening", "teacherApproval", "hours"].map((key) => ({ value: key, label: key }))} />
          <Field label="Reason" value={reason} onChange={setReason} />
          <Check label="I confirm this waiver" checked={confirm} onChange={setConfirm} />
          <Button type="button" variant="secondary" onClick={() => post("/api/certificates/overrides", { studentId, courseId, requirementKey, reason, confirm }, setMessage, router)}>Save waiver</Button>
        </div>
      </section>
      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-base font-semibold">Revoke, correct, or recertify</h2>
        <p className="mt-1 text-sm text-muted">Revocation keeps the record. A correction creates a new ID and does not overwrite the original. Recertification is a new linked certificate.</p>
        <div className="mt-3 space-y-3">
          <Select label="Certificate" value={publicId} onChange={setPublicId} options={certificates.map((item) => ({ value: item.publicId, label: `${item.publicId} · ${item.studentName} · ${item.status}` }))} />
          <Field label="Reason" value={reason} onChange={setReason} />
          <Check label="I confirm this official record change" checked={confirm} onChange={setConfirm} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" onClick={() => post("/api/certificates/revoke", { publicId, reason, confirm }, setMessage, router)}>Revoke</Button>
            <Button type="button" variant="secondary" onClick={() => post("/api/certificates/correct", { publicId, reason, confirm }, setMessage, router)}>Correct with a new ID</Button>
            <Button type="button" variant="secondary" onClick={() => post("/api/certificates/recertify", { publicId, reason, confirm }, setMessage, router)}>Recertify</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function TemplateForms() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("Official completion");
  const [organizationName, setOrganizationName] = useState("EnglishBridge");
  const [title, setTitle] = useState("Certificate of Completion");
  const [footer, setFooter] = useState("Official training record");
  const [signName, setSignName] = useState("");
  const [signTitle, setSignTitle] = useState("");
  const [showScore, setShowScore] = useState(false);
  const [showLevel, setShowLevel] = useState(false);
  const [publicScore, setPublicScore] = useState(false);
  const [autoIssue, setAutoIssue] = useState(false);
  const [pattern, setPattern] = useState("CERT-{YEAR}-{SEQUENCE}");
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-4">
      {message && <p className="text-sm" role="status">{message}</p>}
      <section className="rounded-2xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">Template</h2>
        <p className="text-sm text-muted">Logo image upload is not available. The organization name is printed instead.</p>
        <Field label="Template name" value={name} onChange={setName} />
        <Field label="Organization name" value={organizationName} onChange={setOrganizationName} />
        <Field label="Certificate title" value={title} onChange={setTitle} />
        <Field label="Footer" value={footer} onChange={setFooter} />
        <Check label="Show official exam result on the certificate" checked={showScore} onChange={setShowScore} />
        <Check label="Show recorded English level" checked={showLevel} onChange={setShowLevel} />
        <Check label="Also show that exam result on the public check page" checked={publicScore} onChange={setPublicScore} />
        <Check label="I confirm this template" checked={confirm} onChange={setConfirm} />
        <Button type="button" onClick={() => post("/api/certificates/templates", { name, organizationName, title, footer, showScore, showLevel, publicScore, confirm }, setMessage, router)}>Save template</Button>
      </section>
      <section className="rounded-2xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">Signatory</h2>
        <p className="text-sm text-muted">Students cannot upload a signature. The certificate prints the name and title.</p>
        <Field label="Name" value={signName} onChange={setSignName} />
        <Field label="Title" value={signTitle} onChange={setSignTitle} />
        <Check label="I confirm this signatory" checked={confirm} onChange={setConfirm} />
        <Button type="button" onClick={() => post("/api/certificates/signatories", { name: signName, title: signTitle, confirm }, setMessage, router)}>Save signatory</Button>
      </section>
      <section className="rounded-2xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">Numbering and automatic issuance</h2>
        <Field label="Pattern" value={pattern} onChange={setPattern} />
        <p className="text-xs text-muted">Use {"{YEAR}"} and {"{SEQUENCE}"}. Example result: CERT-2026-000184. Preview does not reserve a number.</p>
        <Check label="Issue automatically when a student is eligible" checked={autoIssue} onChange={setAutoIssue} />
        <p className="text-xs text-muted">Off by default. Turning it on is audited. A failed PDF or QR check still blocks issuance.</p>
        <Check label="I confirm these settings" checked={confirm} onChange={setConfirm} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => post("/api/certificates/settings", { key: "numberingPattern", value: pattern, confirm }, setMessage, router)}>Save numbering</Button>
          <Button type="button" variant="secondary" onClick={() => post("/api/certificates/settings", { key: "autoIssue", value: autoIssue ? "true" : "false", confirm }, setMessage, router)}>{autoIssue ? "Turn automatic issuance on" : "Keep automatic issuance off"}</Button>
        </div>
      </section>
    </div>
  );
}

function RuleEditor({ rules, onChange }: { rules: CompletionRules; onChange: (rules: CompletionRules) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ToggleNumber label="Lessons percent" enabled={rules.lessons.enabled} value={rules.lessons.minPercent} onEnabled={(enabled) => onChange({ ...rules, lessons: { ...rules.lessons, enabled } })} onValue={(minPercent) => onChange({ ...rules, lessons: { ...rules.lessons, minPercent } })} />
      <Check label="Assignments required" checked={rules.assignments.enabled} onChange={(enabled) => onChange({ ...rules, assignments: { ...rules.assignments, enabled } })} />
      <Check label="Assignments must be graded" checked={rules.assignments.requireGraded} onChange={(requireGraded) => onChange({ ...rules, assignments: { ...rules.assignments, requireGraded } })} />
      <Check label="Count practice-type teacher tasks" checked={rules.assignments.includePracticeTasks} onChange={(includePracticeTasks) => onChange({ ...rules, assignments: { ...rules.assignments, includePracticeTasks } })} />
      <Check label="Official exams required" checked={rules.exams.enabled} onChange={(enabled) => onChange({ ...rules, exams: { ...rules.exams, enabled } })} />
      <ToggleNumber label="Exam percent if not using each exam's score" enabled={rules.exams.enabled} value={rules.exams.minPercent} onEnabled={(enabled) => onChange({ ...rules, exams: { ...rules.exams, enabled } })} onValue={(minPercent) => onChange({ ...rules, exams: { ...rules.exams, minPercent } })} />
      <Check label="Use each exam's stored passing score" checked={rules.exams.useAssessmentPassingScore} onChange={(useAssessmentPassingScore) => onChange({ ...rules, exams: { ...rules.exams, useAssessmentPassingScore } })} />
      <Check label="Quizzes count as official" checked={rules.quizzes.enabled} onChange={(enabled) => onChange({ ...rules, quizzes: { ...rules.quizzes, enabled } })} />
      <ToggleNumber label="Attendance percent" enabled={rules.attendance.enabled} value={rules.attendance.minPercent} onEnabled={(enabled) => onChange({ ...rules, attendance: { ...rules.attendance, enabled } })} onValue={(minPercent) => onChange({ ...rules, attendance: { ...rules.attendance, minPercent } })} />
      <Check label="Official speaking required" checked={rules.speaking.enabled} onChange={(enabled) => onChange({ ...rules, speaking: { ...rules.speaking, enabled } })} />
      <Check label="Official listening required" checked={rules.listening.enabled} onChange={(enabled) => onChange({ ...rules, listening: { ...rules.listening, enabled } })} />
      <Check label="Teacher approval required" checked={rules.teacherApproval.enabled} onChange={(enabled) => onChange({ ...rules, teacherApproval: { ...rules.teacherApproval, enabled } })} />
      <Select label="Hours" value={rules.hours.mode} onChange={(mode) => onChange({ ...rules, hours: { ...rules.hours, mode: mode as CompletionRules["hours"]["mode"] } })} options={[{ value: "NONE", label: "Do not use hours" }, { value: "PLANNED", label: "Show planned hours" }, { value: "ATTENDANCE", label: "Require attendance hours" }]} />
      <label className="block text-sm">Planned hours
        <input className="mt-1 h-11 w-28 rounded-lg border border-border px-2" type="number" min={0} value={rules.hours.plannedHours ?? ""} onChange={(event) => onChange({ ...rules, hours: { ...rules.hours, plannedHours: event.target.value === "" ? null : Number(event.target.value) } })} />
      </label>
      <label className="block text-sm">Minimum attendance hours
        <input className="mt-1 h-11 w-28 rounded-lg border border-border px-2" type="number" min={0} value={rules.hours.minAttendedHours ?? ""} onChange={(event) => onChange({ ...rules, hours: { ...rules.hours, minAttendedHours: event.target.value === "" ? null : Number(event.target.value) } })} />
      </label>
      <label className="block text-sm">Expiration months
        <input className="mt-1 h-11 w-28 rounded-lg border border-border px-2" type="number" min={1} max={120} value={rules.expirationMonths ?? ""} onChange={(event) => onChange({ ...rules, expirationMonths: event.target.value === "" ? null : Number(event.target.value) })} />
      </label>
    </div>
  );
}

function ToggleNumber({ label, enabled, value, onEnabled, onValue }: { label: string; enabled: boolean; value: number; onEnabled: (value: boolean) => void; onValue: (value: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} />{label}</span>
      <input className="mt-1 h-11 w-24 rounded-lg border border-border px-2" type="number" min={1} max={100} value={value} onChange={(event) => onValue(Number(event.target.value))} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm">{label}<input className="mt-1 h-11 w-full rounded-lg border border-border px-2" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-sm">{label}
      <select className="mt-1 h-11 w-full rounded-lg border border-border px-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.length === 0 && <option value="">None available</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

async function post(url: string, body: unknown, setMessage: (value: string) => void, router: { refresh: () => void }) {
  try {
    const data = await apiFetch<unknown>(url, { method: "POST", body });
    setMessage(typeof data === "object" && data ? JSON.stringify(data) : "Saved.");
    router.refresh();
  } catch (err) {
    setMessage(err instanceof ApiClientError ? err.message : "The action was not completed.");
  }
}

async function submit(event: FormEvent, url: string, body: unknown, setMessage: (value: string) => void, router: { refresh: () => void }) {
  event.preventDefault();
  await post(url, body, setMessage, router);
}
