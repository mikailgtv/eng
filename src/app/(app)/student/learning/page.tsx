import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { getLearningSummary } from "@/lib/learning";
import { MyLearning, MyLearningHeader } from "@/components/learning/my-learning";
import { ContentRecommendations } from "@/components/content/recommendations";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My Learning" };

export default async function StudentLearningPage() {
  const user = await requirePageUser(["STUDENT", "ADMIN"]);
  const [learning, profile] = await Promise.all([
    getLearningSummary(user.id, user.groupId),
    prisma.studentLearningProfile.findUnique({ where: { studentId: user.id }, select: { targetLevelCode: true, levelStatus: true } }),
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <MyLearningHeader currentLevel={user.englishLevel} targetLevel={profile?.targetLevelCode ?? null} />
      {!user.englishLevel && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Level not assigned yet. Your teacher will set a confirmed level before the level-based path is unlocked.</div>}
      <ContentRecommendations studentId={user.id} />
      <MyLearning learning={learning} />
    </div>
  );
}
