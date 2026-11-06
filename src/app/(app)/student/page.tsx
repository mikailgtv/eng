import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { getLearningSummary } from "@/lib/learning";
import { countDueVocabulary, getPracticeStats, getRecentPractice } from "@/lib/practice";
import { listMyAttemptHistory, listStudentAssessments } from "@/lib/assessment/queries";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import Link from "next/link";
import { studentPlan } from "@/lib/adaptive/service";
import { studentEngagement } from "@/lib/gamification/service";
import { prisma } from "@/lib/prisma";
import { takePendingMascotReaction } from "@/lib/mascot/service";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentDashboardPage() {
  const user = await requirePageUser(["STUDENT", "ADMIN"]);
  const plan = await studentPlan(user.id).catch(() => null);
  const engagement = user.role === "STUDENT" ? await studentEngagement(user.id).catch(() => null) : null;
  const profile = user.role === "STUDENT" ? await prisma.studentLearningProfile.findUnique({ where: { studentId: user.id }, select: { targetLevelCode: true, levelStatus: true } }) : null;
  const mascotReaction = user.role === "STUDENT" ? await takePendingMascotReaction(user.id).catch(() => null) : null;
  const [learning, practice, dueWords, recentAttempts, assessments, results] = await Promise.all([
    getLearningSummary(user.id, user.groupId),
    getPracticeStats(user.id),
    countDueVocabulary(user.id),
    getRecentPractice(user.id, 5),
    listStudentAssessments({ id: user.id, role: user.role, groupId: user.groupId }),
    listMyAttemptHistory({ id: user.id, role: user.role, groupId: user.groupId }),
  ]);
  return (
    <div>
      {user.role === "STUDENT" && <p className="mb-4 text-sm"><Link className="underline" href="/student/certificates">Certificates and official training record</Link>. Practice, XP, and the AI tutor do not count toward a certificate.</p>}
    <StudentDashboard
      user={user}
      learningProfile={profile}
      mascotReaction={mascotReaction}
      learning={learning}
      practice={practice}
      dueWords={dueWords}
      recentAttempts={recentAttempts}
      upcomingAssessments={assessments.filter((a) => a.status === "SCHEDULED").slice(0, 3)}
      openAssessments={assessments.filter((a) => a.status === "OPEN" && (a.canStart || a.activeAttemptId)).slice(0, 3)}
      recentResults={results.slice(0, 3)}
      quizProgress={assessments.filter((a) => a.type === "QUIZ" && a.lastPercentage !== null).slice(0, 4)}
      plan={plan && !plan.disabled ? { minutes: plan.minutes, items: plan.items, note: plan.note } : null}
      engagement={engagement && !engagement.disabled ? engagement : null}
    />
    </div>
  );
}
