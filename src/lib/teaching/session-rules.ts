/** Pure validation rules for completing an in-person teaching session. */
export type SessionCompletionEvidence = {
  status: string;
  actualStart: Date | null;
  hasValidLesson: boolean;
  activeStudentIds: string[];
  attendedStudentIds: string[];
};

export function sessionCompletionIssues(evidence: SessionCompletionEvidence): string[] {
  const issues: string[] = [];
  if (evidence.status !== "IN_PROGRESS") issues.push("The session must be in progress.");
  if (!evidence.actualStart) issues.push("A server-recorded start time is missing. Start the class first.");
  if (!evidence.hasValidLesson) issues.push("Select a published lesson assigned to this class.");
  if (evidence.activeStudentIds.length === 0) issues.push("There are no active students in this class to take attendance for.");
  const attended = new Set(evidence.attendedStudentIds);
  const missing = evidence.activeStudentIds.filter((id) => !attended.has(id));
  if (missing.length > 0) issues.push(`Attendance is missing for ${missing.length} active student${missing.length === 1 ? "" : "s"}.`);
  return issues;
}
