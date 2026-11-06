/**
 * Official completion engine.
 * Reads lessons, assignments, exams, attendance, and teacher approvals.
 * Does not read XP, badges, streaks, AI sessions, or personal practice.
 */
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import {
  STATUS_DEFINITIONS,
  deriveStatus,
  meetsThreshold,
  officialDateTime,
  parseCompletionRules,
  percent,
  requirement,
  ruleSummary,
  type CompletionRules,
  type CourseStatus,
  type Requirement,
} from "@/lib/certificates/rules";

export type Evaluation = {
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  courseStatus: string;
  status: CourseStatus;
  statusDefinition: string;
  eligible: boolean;
  requirements: Requirement[];
  started: boolean;
  hours: { planned: number | null; plannedNote: string; recorded: number | null; recordedNote: string };
  attendance: { recorded: boolean; present: number; late: number; absent: number; excused: number; completedSessions: number; note: string };
  officialScore: string | null;
  englishLevel: string | null;
  ruleSummary: string | null;
  certificates: CertificateView[];
  completionRecordedAt: string | null;
};

export type CertificateView = {
  publicId: string;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
  downloadPath: string | null;
  automatic: boolean;
  supersedesId: string | null;
  supersededById: string | null;
  recertifiesId: string | null;
};

const OFFICIAL_EXAM_STATUSES = ["SCHEDULED", "OPEN", "CLOSED"];

export async function evaluateCourse(studentId: string, courseId: string): Promise<Evaluation> {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { completionRuleConfig: true },
  });
  if (!student || !course) {
    throw new Error("Student or course not found.");
  }
  const [lessons, assignments, exams, quizzes, sessions, speaking, listening, approvals, overrides, completion, certificates] = await Promise.all([
    prisma.lesson.findMany({
      where: { status: "PUBLISHED", module: { status: "PUBLISHED", courseId } },
      select: { id: true, title: true },
    }),
    student.groupId
      ? prisma.assignment.findMany({
        where: {
          groupId: student.groupId,
          status: { in: ["PUBLISHED", "CLOSED"] },
          OR: [{ courseId }, { lesson: { module: { courseId } } }],
        },
        include: { submissions: { where: { studentId } } },
      })
      : Promise.resolve([]),
    prisma.assessment.findMany({
      where: { courseId, type: "EXAM", status: { in: OFFICIAL_EXAM_STATUSES } },
      include: { attempts: { where: { studentId, status: "GRADED" }, orderBy: { submittedAt: "desc" } } },
    }),
    prisma.assessment.findMany({
      where: { courseId, type: "QUIZ", status: { in: OFFICIAL_EXAM_STATUSES } },
      include: { attempts: { where: { studentId, status: "GRADED" }, orderBy: { submittedAt: "desc" } } },
    }),
    student.groupId
      ? prisma.classSession.findMany({
        where: { courseId, groupId: student.groupId, status: "COMPLETED" },
        include: { attendance: { where: { studentId } } },
      })
      : Promise.resolve([]),
    student.groupId
      ? prisma.speakingAssignment.findMany({
        where: { groupId: student.groupId, status: { in: ["PUBLISHED", "CLOSED"] }, lesson: { module: { courseId } } },
        include: { submissions: { where: { studentId } } },
      })
      : Promise.resolve([]),
    student.groupId
      ? prisma.listeningAssignment.findMany({
        where: { groupId: student.groupId, status: { in: ["PUBLISHED", "CLOSED"] }, exercise: { lesson: { module: { courseId } } } },
      })
      : Promise.resolve([]),
    prisma.teacherApproval.findMany({ where: { studentId, courseId }, orderBy: { createdAt: "desc" }, include: { actor: true } }),
    prisma.requirementOverride.findMany({ where: { studentId, courseId, active: true }, include: { actor: true } }),
    prisma.courseCompletionRecord.findUnique({ where: { studentId_courseId: { studentId, courseId } } }),
    prisma.certificate.findMany({ where: { studentId, courseId }, orderBy: { issuedAt: "desc" } }),
  ]);

  const progress = lessons.length
    ? await prisma.lessonProgress.findMany({ where: { studentId, lessonId: { in: lessons.map((lesson) => lesson.id) } } })
    : [];
  const listeningAttempts = listening.length
    ? await prisma.listeningAttempt.findMany({
      where: { studentId, assignmentId: { in: listening.map((item) => item.id) }, questionCount: { gt: 0 } },
    })
    : [];

  const rules = safeRules(course.completionRuleConfig?.rules ?? null);
  const ruleInvalid = Boolean(course.completionRuleConfig?.rules) && !rules;
  const overrideByKey = new Map(overrides.map((item) => [item.requirementKey, item]));
  const requirements: Requirement[] = [];

  if (!rules) {
    requirements.push(requirement(
      "rule",
      "Configured completion rule",
      "MISSING",
      ruleInvalid
        ? "The saved completion rule is not valid, so eligibility cannot be granted."
        : "No completion rule is saved for this course. There is no default formula.",
      "An administrator needs to save a valid completion rule for this course.",
    ));
  } else {
    requirements.push(requirement("rule", "Configured completion rule", "MET", ruleSummary(rules), null));
    requirements.push(lessonRequirement(rules, lessons, progress, overrideByKey));
    requirements.push(assignmentRequirement(rules, assignments, student.groupId, overrideByKey));
    requirements.push(assessmentRequirement("exams", "Official exam", rules.exams, exams, overrideByKey, false));
    requirements.push(assessmentRequirement("quizzes", "Quiz configured as official", rules.quizzes, quizzes, overrideByKey, true));
    requirements.push(attendanceRequirement(rules, sessions, student.groupId, overrideByKey));
    requirements.push(speakingRequirement(rules, speaking, student.groupId, overrideByKey));
    requirements.push(await listeningRequirement(rules, listening, listeningAttempts, student.groupId, overrideByKey));
    requirements.push(approvalRequirement(rules, approvals, overrideByKey));
    requirements.push(hoursRequirement(rules, sessions, overrideByKey));
  }

  const relevant = requirements.filter((item) => item.status !== "NOT_REQUIRED" && item.key !== "rule");
  const eligible = Boolean(rules) && relevant.length > 0 && relevant.every((item) => item.status === "MET" || item.status === "OVERRIDDEN");
  const started = hasOfficialStart(progress, assignments, exams, quizzes, sessions, speaking, listeningAttempts);
  const certificate = certificateLifecycle(certificates);
  const status = deriveStatus({
    courseArchived: course.status === "ARCHIVED",
    ruleConfigured: Boolean(rules),
    started,
    eligible,
    completionRecorded: Boolean(completion?.completedAt),
    archivedRecord: Boolean(completion?.archivedAt),
    certificate,
  });
  const attendance = attendanceFacts(sessions);
  const hours = hoursFacts(rules, sessions);
  const officialScore = latestExamScore(exams);

  return {
    studentId,
    studentName: fullName(student),
    courseId,
    courseTitle: course.title,
    courseCode: course.code,
    courseStatus: course.status,
    status,
    statusDefinition: STATUS_DEFINITIONS[status],
    eligible,
    requirements,
    started,
    hours,
    attendance,
    officialScore,
    englishLevel: student.englishLevel,
    ruleSummary: rules ? ruleSummary(rules) : null,
    certificates: certificates.map(toCertificateView),
    completionRecordedAt: completion?.completedAt ? officialDateTime(completion.completedAt) : null,
  };
}

function safeRules(raw: string | null): CompletionRules | null {
  if (!raw) return null;
  try {
    return parseCompletionRules(JSON.parse(raw));
  } catch {
    return null;
  }
}

function applyOverride(key: string, item: Requirement, overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>): Requirement {
  const override = overrides.get(key);
  if (!override || item.status === "NOT_REQUIRED") return item;
  return {
    ...item,
    status: "OVERRIDDEN",
    missingAction: null,
    evidence: `${item.evidence} Waived by ${fullName(override.actor)} on ${officialDateTime(override.createdAt)}: ${override.reason}`,
  };
}

function lessonRequirement(rules: CompletionRules, lessons: { id: string; title: string }[], progress: { lessonId: string; status: string }[], overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>): Requirement {
  if (!rules.lessons.enabled) return requirement("lessons", "Published lessons", "NOT_REQUIRED", "This course rule does not use lessons.", null);
  if (lessons.length === 0) {
    return applyOverride("lessons", requirement("lessons", "Published lessons", "MISSING", "No published lessons are in this course.", "Publish lessons, or turn this requirement off."), overrides);
  }
  const completed = progress.filter((item) => item.status === "COMPLETED").length;
  const score = percent(completed, lessons.length) ?? 0;
  const met = meetsThreshold(score, rules.lessons.minPercent);
  const missingTitles = lessons.filter((lesson) => !progress.some((item) => item.lessonId === lesson.id && item.status === "COMPLETED")).map((lesson) => lesson.title);
  return applyOverride("lessons", requirement(
    "lessons",
    `Complete ${rules.lessons.minPercent}% of published lessons`,
    met ? "MET" : "MISSING",
    `${completed} of ${lessons.length} published lessons are completed (${score}%). Required: ${rules.lessons.minPercent}%.`,
    missingTitles.length ? `Finish: ${missingTitles.slice(0, 6).join(", ")}.` : "Finish the remaining published lessons.",
  ), overrides);
}

function assignmentRequirement(
  rules: CompletionRules,
  assignments: { title: string; type: string; submissions: { status: string }[] }[],
  groupId: string | null,
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
): Requirement {
  if (!rules.assignments.enabled) return requirement("assignments", "Official assignments", "NOT_REQUIRED", "This course rule does not use assignments.", null);
  if (!groupId) return applyOverride("assignments", requirement("assignments", "Official assignments", "MISSING", "The student is not in a learning group, so official assignments cannot be matched.", "Assign the student to a group."), overrides);
  const official = assignments.filter((item) => rules.assignments.includePracticeTasks || item.type !== "PRACTICE");
  if (official.length === 0) {
    return applyOverride("assignments", requirement("assignments", "Official assignments", "MISSING", "No official assignment is published for this course. Practice-engine activities are not counted.", "Publish an official assignment, or turn this requirement off."), overrides);
  }
  const done = official.filter((item) => {
    const status = item.submissions[0]?.status;
    if (rules.assignments.requireGraded) return status === "GRADED";
    return status === "SUBMITTED" || status === "LATE" || status === "GRADED";
  });
  const missing = official.filter((item) => !done.includes(item)).map((item) => item.title);
  return applyOverride("assignments", requirement(
    "assignments",
    rules.assignments.requireGraded ? "Graded official assignments" : "Submitted official assignments",
    missing.length === 0 ? "MET" : "MISSING",
    `${done.length} of ${official.length} official assignments are complete. Practice activities and XP are not counted.`,
    missing.length ? `Submit or finish: ${missing.slice(0, 6).join(", ")}.` : null,
  ), overrides);
}

function assessmentRequirement(
  key: "exams" | "quizzes",
  label: string,
  rule: { enabled: boolean; minPercent: number; useAssessmentPassingScore?: boolean },
  assessments: { title: string; passingScore: number; attempts: { percentage: number | null; submittedAt: Date | null }[] }[],
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
  quiz: boolean,
): Requirement {
  if (!rule.enabled) {
    return requirement(key, label, "NOT_REQUIRED", quiz ? "Quizzes are not an official requirement unless this course rule says so." : "Official exams are not required by this course rule.", null);
  }
  if (assessments.length === 0) {
    return applyOverride(key, requirement(key, label, "MISSING", quiz ? "No quiz is published, and personal practice is not a quiz." : "No official exam is published. Practice attempts are not exams.", "Publish the official assessment, or turn this requirement off."), overrides);
  }
  const missing: string[] = [];
  const evidence: string[] = [];
  for (const assessment of assessments) {
    const latest = assessment.attempts.find((attempt) => attempt.percentage !== null);
    const threshold = rule.useAssessmentPassingScore ? assessment.passingScore : rule.minPercent;
    if (!latest || latest.percentage === null) {
      missing.push(assessment.title);
      evidence.push(`${assessment.title}: no graded attempt. Stored attempts were not changed.`);
      continue;
    }
    const met = meetsThreshold(latest.percentage, threshold);
    evidence.push(`${assessment.title}: latest graded result ${latest.percentage}%. Required ${threshold}%. Earlier attempts were not changed.`);
    if (!met) missing.push(assessment.title);
  }
  return applyOverride(key, requirement(
    key,
    label,
    missing.length === 0 ? "MET" : "MISSING",
    evidence.join(" "),
    missing.length ? `A graded official result is still needed for: ${missing.join(", ")}.` : null,
  ), overrides);
}

function attendanceFacts(sessions: { attendance: { status: string }[] }[]) {
  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;
  let unmarked = 0;
  for (const session of sessions) {
    const status = session.attendance[0]?.status;
    if (status === "PRESENT") present += 1;
    else if (status === "LATE") late += 1;
    else if (status === "ABSENT") absent += 1;
    else if (status === "EXCUSED") excused += 1;
    else unmarked += 1;
  }
  const recorded = sessions.length > 0;
  const denominator = sessions.length - excused;
  const attended = present + late;
  const score = recorded && denominator > 0 ? percent(attended, denominator) : null;
  const note = recorded
    ? `${attended} of ${denominator} counted classes are present or late. Excused classes are not counted against attendance. Unmarked classes: ${unmarked}. Login time is not used.`
    : "No official class attendance is recorded. Login time is not used.";
  return { recorded, present, late, absent, excused, completedSessions: sessions.length, note, score };
}

function attendanceRequirement(
  rules: CompletionRules,
  sessions: { attendance: { status: string }[] }[],
  groupId: string | null,
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
): Requirement {
  if (!rules.attendance.enabled) return requirement("attendance", "Official attendance", "NOT_REQUIRED", "This course rule does not use attendance.", null);
  if (!groupId) return applyOverride("attendance", requirement("attendance", "Official attendance", "MISSING", "The student is not in a learning group. Login time is not used.", "Assign the student to a group."), overrides);
  const facts = attendanceFacts(sessions);
  if (!facts.recorded || facts.score === null) {
    return applyOverride("attendance", requirement("attendance", `Attendance at least ${rules.attendance.minPercent}%`, "MISSING", facts.note, "Attendance must be marked on a completed class. Login time is not used."), overrides);
  }
  return applyOverride("attendance", requirement(
    "attendance",
    `Attendance at least ${rules.attendance.minPercent}%`,
    meetsThreshold(facts.score, rules.attendance.minPercent) ? "MET" : "MISSING",
    `${facts.note} Current attendance: ${facts.score}%. Required: ${rules.attendance.minPercent}%.`,
    "Attend the remaining completed classes, or ask a teacher to mark an official attendance record.",
  ), overrides);
}

function speakingRequirement(
  rules: CompletionRules,
  assignments: { title: string; submissions: { status: string }[] }[],
  groupId: string | null,
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
): Requirement {
  if (!rules.speaking.enabled) return requirement("speaking", "Official speaking assignment", "NOT_REQUIRED", "Personal speaking and AI speaking feedback are not official unless this rule is on.", null);
  if (!groupId) return applyOverride("speaking", requirement("speaking", "Official speaking assignment", "MISSING", "The student is not in a learning group.", "Assign the student to a group."), overrides);
  if (assignments.length === 0) {
    return applyOverride("speaking", requirement("speaking", "Official speaking assignment", "MISSING", "No official speaking assignment is published for this course. Personal speaking is not counted.", "Publish an official speaking assignment, or turn this requirement off."), overrides);
  }
  const done = assignments.filter((item) => {
    const status = item.submissions[0]?.status;
    return rules.speaking.requireReviewed ? status === "REVIEWED" : status === "SUBMITTED" || status === "REVIEWED";
  });
  const missing = assignments.filter((item) => !done.includes(item)).map((item) => item.title);
  return applyOverride("speaking", requirement(
    "speaking",
    rules.speaking.requireReviewed ? "Reviewed official speaking" : "Submitted official speaking",
    missing.length === 0 ? "MET" : "MISSING",
    `${done.length} of ${assignments.length} official speaking assignments are complete. AI speaking feedback is not a grade.`,
    missing.length ? `Finish: ${missing.slice(0, 6).join(", ")}.` : null,
  ), overrides);
}

async function listeningRequirement(
  rules: CompletionRules,
  assignments: { id: string; title: string }[],
  attempts: { assignmentId: string | null }[],
  groupId: string | null,
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
): Promise<Requirement> {
  if (!rules.listening.enabled) return requirement("listening", "Official listening assignment", "NOT_REQUIRED", "Personal listening practice is not official unless this rule is on.", null);
  if (!groupId) return applyOverride("listening", requirement("listening", "Official listening assignment", "MISSING", "The student is not in a learning group.", "Assign the student to a group."), overrides);
  if (assignments.length === 0) {
    return applyOverride("listening", requirement("listening", "Official listening assignment", "MISSING", "No official listening assignment is published for this course.", "Publish an official listening assignment, or turn this requirement off."), overrides);
  }
  const doneIds = new Set(attempts.map((item) => item.assignmentId));
  const missing = assignments.filter((item) => !doneIds.has(item.id)).map((item) => item.title);
  return applyOverride("listening", requirement(
    "listening",
    "Official listening assignment",
    missing.length === 0 ? "MET" : "MISSING",
    `${assignments.length - missing.length} of ${assignments.length} official listening assignments have a stored attempt. Personal listening is not counted.`,
    missing.length ? `Submit: ${missing.slice(0, 6).join(", ")}.` : null,
  ), overrides);
}

function approvalRequirement(
  rules: CompletionRules,
  approvals: { status: string; kind: string; note: string | null; createdAt: Date; actor: { firstName: string; lastName: string } }[],
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
): Requirement {
  if (!rules.teacherApproval.enabled) return requirement("teacherApproval", "Teacher approval", "NOT_REQUIRED", "This course rule does not require a separate teacher approval.", null);
  const latest = approvals[0];
  if (!latest || latest.status !== "APPROVED") {
    const evidence = latest
      ? `Latest approval is ${latest.status} by ${fullName(latest.actor)} on ${officialDateTime(latest.createdAt)}. ${latest.note ?? ""}`.trim()
      : "No official teacher approval is recorded.";
    return applyOverride("teacherApproval", requirement("teacherApproval", "Teacher approval", "MISSING", evidence, "A teacher needs to record an official approval for this course."), overrides);
  }
  return applyOverride("teacherApproval", requirement(
    "teacherApproval",
    "Teacher approval",
    "MET",
    `${latest.kind} approved by ${fullName(latest.actor)} on ${officialDateTime(latest.createdAt)}. ${latest.note ?? ""}`.trim(),
    null,
  ), overrides);
}

function hoursFacts(rules: CompletionRules | null, sessions: { scheduledStart: Date; scheduledEnd: Date; actualStart: Date | null; actualEnd: Date | null; attendance: { status: string }[] }[]) {
  const planned = rules?.hours.mode === "PLANNED" ? rules.hours.plannedHours : rules?.hours.plannedHours ?? null;
  const attended = sessions.filter((session) => ["PRESENT", "LATE"].includes(session.attendance[0]?.status ?? ""));
  if (attended.length === 0) {
    return {
      planned,
      plannedNote: planned === null ? "Planned hours are not configured. This is not attendance." : `Planned hours are configured as ${planned}. This is not attendance.`,
      recorded: null,
      recordedNote: "No attended class has an official attendance record, so training hours are not claimed. Login time is not used.",
    };
  }
  let minutes = 0;
  let skipped = 0;
  for (const session of attended) {
    const start = session.actualStart ?? session.scheduledStart;
    const end = session.actualEnd ?? session.scheduledEnd;
    const diff = (end.getTime() - start.getTime()) / 60000;
    if (diff > 0 && diff < 24 * 60) minutes += diff;
    else skipped += 1;
  }
  const recorded = Math.round((minutes / 60) * 10) / 10;
  return {
    planned,
    plannedNote: planned === null ? "Planned hours are not configured. This is not attendance." : `Planned hours are configured as ${planned}. This is not attendance.`,
    recorded,
    recordedNote: skipped
      ? `${recorded} hours from attendance records. ${skipped} attended class had no usable start and end time and was not added. Login time is not used.`
      : `${recorded} hours from attendance records on present or late classes. Login time is not used.`,
  };
}

function hoursRequirement(
  rules: CompletionRules,
  sessions: { scheduledStart: Date; scheduledEnd: Date; actualStart: Date | null; actualEnd: Date | null; attendance: { status: string }[] }[],
  overrides: Map<string, { reason: string; createdAt: Date; actor: { firstName: string; lastName: string } }>,
): Requirement {
  const facts = hoursFacts(rules, sessions);
  if (rules.hours.mode === "NONE") return requirement("hours", "Training hours", "NOT_REQUIRED", `${facts.plannedNote} ${facts.recordedNote}`, null);
  if (rules.hours.mode === "PLANNED") {
    return applyOverride("hours", requirement("hours", "Planned training hours", "MET", facts.plannedNote, null), overrides);
  }
  const required = rules.hours.minAttendedHours ?? 0;
  const met = facts.recorded !== null && facts.recorded >= required;
  return applyOverride("hours", requirement(
    "hours",
    `At least ${required} attendance hours`,
    met ? "MET" : "MISSING",
    facts.recordedNote,
    "Attendance hours come only from marked classes. Login time is not used.",
  ), overrides);
}

function hasOfficialStart(
  progress: { status: string }[],
  assignments: { submissions: { status: string }[] }[],
  exams: { attempts: unknown[] }[],
  quizzes: { attempts: unknown[] }[],
  sessions: { attendance: unknown[] }[],
  speaking: { submissions: { status: string }[] }[],
  listeningAttempts: unknown[],
): boolean {
  return progress.some((item) => item.status !== "NOT_STARTED")
    || assignments.some((item) => item.submissions.length > 0)
    || exams.some((item) => item.attempts.length > 0)
    || quizzes.some((item) => item.attempts.length > 0)
    || sessions.some((item) => item.attendance.length > 0)
    || speaking.some((item) => item.submissions.some((submission) => submission.status !== "NOT_STARTED"))
    || listeningAttempts.length > 0;
}

function certificateLifecycle(certificates: { status: string; issuedAt: Date }[]): "NONE" | "ISSUED" | "EXPIRED" | "REVOKED" | "SUPERSEDED" {
  const active = certificates.find((item) => item.status === "ISSUED" || item.status === "EXPIRED" || item.status === "REVOKED");
  if (!active) return certificates.some((item) => item.status === "SUPERSEDED") ? "SUPERSEDED" : "NONE";
  if (active.status === "ISSUED") return "ISSUED";
  if (active.status === "EXPIRED") return "EXPIRED";
  return "REVOKED";
}

function latestExamScore(exams: { attempts: { percentage: number | null }[] }[]): string | null {
  const scores = exams.map((exam) => exam.attempts.find((attempt) => attempt.percentage !== null)?.percentage).filter((score): score is number => score !== null && score !== undefined);
  if (scores.length === 0) return null;
  return `${Math.min(...scores)}%`;
}

function toCertificateView(certificate: {
  publicId: string;
  status: string;
  issuedAt: Date;
  expiresAt: Date | null;
  downloadToken: string;
  automatic: boolean;
  supersedesId: string | null;
  supersededById: string | null;
  recertifiesId: string | null;
}): CertificateView {
  return {
    publicId: certificate.publicId,
    status: certificate.status,
    issuedAt: officialDateTime(certificate.issuedAt),
    expiresAt: certificate.expiresAt ? officialDateTime(certificate.expiresAt) : null,
    downloadPath: `/api/certificates/download/${certificate.downloadToken}`,
    automatic: certificate.automatic,
    supersedesId: certificate.supersedesId,
    supersededById: certificate.supersededById,
    recertifiesId: certificate.recertifiesId,
  };
}

export async function persistEvaluation(evaluation: Evaluation) {
  await prisma.courseCompletionRecord.upsert({
    where: { studentId_courseId: { studentId: evaluation.studentId, courseId: evaluation.courseId } },
    create: {
      studentId: evaluation.studentId,
      courseId: evaluation.courseId,
      status: evaluation.status,
      eligible: evaluation.eligible,
      evaluatedAt: new Date(),
      summary: JSON.stringify({ requirements: evaluation.requirements, hours: evaluation.hours }),
    },
    update: {
      status: evaluation.status,
      eligible: evaluation.eligible,
      evaluatedAt: new Date(),
      summary: JSON.stringify({ requirements: evaluation.requirements, hours: evaluation.hours }),
    },
  });
}
