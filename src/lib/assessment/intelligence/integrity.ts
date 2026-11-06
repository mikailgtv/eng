import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

const ALLOWED = new Set(["TAB_HIDDEN", "FOCUS_LOST", "RECONNECT", "INACTIVITY", "SESSION_CHANGE"]);
const recent = new Map<string, { count: number; resetAt: number }>();

export async function recordIntegrityEvent(studentId: string, attemptId: string, kind: string) {
  if (!ALLOWED.has(kind)) throw new ApiError(422, "Unknown integrity event.");
  const key = `${attemptId}:${kind}`;
  const now = Date.now();
  const bucket = recent.get(key);
  if (!bucket || bucket.resetAt < now) recent.set(key, { count: 1, resetAt: now + 60_000 });
  else if (bucket.count >= 20) throw new ApiError(429, "Too many integrity events. Wait a moment and continue the exam.");
  else bucket.count += 1;
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId }, select: { studentId: true, status: true } });
  if (!attempt || attempt.studentId !== studentId || attempt.status !== "IN_PROGRESS") throw new ApiError(404, "Attempt not found.");
  return prisma.assessmentAttemptEvent.create({
    data: { attemptId, studentId, kind, detail: JSON.stringify({ signal: true, proof: false }) },
  });
}

export async function integritySummary(attemptId: string) {
  const events = await prisma.assessmentAttemptEvent.groupBy({
    by: ["kind"],
    where: { attemptId },
    _count: { kind: true },
  });
  return {
    label: "Assessment integrity events",
    note: "These are signals for review, not proof of misconduct. A browser cannot prove or prevent cheating.",
    events: events.map((event) => ({ kind: event.kind, count: event._count.kind })),
  };
}
