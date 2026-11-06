import {
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Lock,
  MessageCircle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { formatDate, fullName } from "@/lib/utils";
import { levelLabel } from "@/lib/constants";
import type { SafeUser } from "@/types";

/**
 * Student profile — shared by three viewers: the student (own profile),
 * a teacher (student in an assigned group) and an admin.
 *
 * The "Coming in a later phase" blocks mark the reserved architectural space
 * for Progress, Courses, Exams, Attendance, Certificates and the AI Tutor.
 * They are static markers — not clickable fake features.
 */

const FUTURE_SECTIONS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: TrendingUp, title: "Progress", description: "Skill-by-skill progress across courses and lessons." },
  { icon: BookOpen, title: "Courses", description: "Assigned courses, modules and lesson history." },
  { icon: ClipboardList, title: "Exams", description: "Exam attempts, scores and feedback." },
  { icon: CalendarCheck, title: "Attendance", description: "Class attendance record." },
  { icon: Award, title: "Certificates", description: "Completed levels and issued certificates." },
  { icon: MessageCircle, title: "AI Tutor", description: "Practice conversations with an AI tutor." },
];

export function StudentProfile({
  student,
  viewerNote,
}: {
  student: SafeUser;
  /** Context line, e.g. "Viewed by teacher" — optional. */
  viewerNote?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Identity header */}
      <Card className="mb-6">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar person={student} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{fullName(student)}</h1>
              <RoleBadge role={student.role} />
              <StatusBadge status={student.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Employee code <span className="font-medium text-foreground">{student.employeeCode}</span>
              {viewerNote && <span className="text-muted"> · {viewerNote}</span>}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Full name" value={fullName(student)} />
            <Detail label="Employee code" value={student.employeeCode} />
            <Detail label="Learning group" value={student.group?.name ?? "Not assigned yet"} />
            <Detail label="Current English level" value={levelLabel(student.englishLevel)} />
            <Detail label="Account status" value={<StatusBadge status={student.status} />} />
            <Detail label="Member since" value={formatDate(student.createdAt)} />
            <Detail label="Username" value={student.username} />
            <Detail label="Email" value={student.email ?? "Not provided"} />
          </dl>
        </CardBody>
      </Card>

      {/* Reserved space for later phases — explicit, honest markers (students only) */}
      {student.role === "STUDENT" && (
      <Card>
        <CardHeader>
          <CardTitle>Learning record</CardTitle>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/10 px-2.5 py-1 text-[11px] font-medium text-muted">
            <Lock className="h-3 w-3" aria-hidden /> Future phases
          </span>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FUTURE_SECTIONS.map((s) => (
            <div key={s.title} className="rounded-lg border border-dashed border-border bg-muted/5 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted" aria-hidden />
                <p className="text-[13px] font-medium text-foreground">{s.title}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{s.description} Available in a later phase.</p>
            </div>
          ))}
        </CardBody>
      </Card>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
