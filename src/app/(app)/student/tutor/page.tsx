import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { refreshRecommendations } from "@/lib/ai/recommendations";
import { TutorChat } from "@/components/ai/tutor-chat";
import { levelLabel } from "@/lib/constants";

export const metadata: Metadata = { title: "English Tutor" };

export default async function StudentTutorPage() {
  const user = await requirePageUser(["STUDENT"]);
  const [active, recommendations] = await Promise.all([
    prisma.aiSession.findFirst({
      where: { studentId: user.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      include: { messages: { where: { role: { in: ["USER", "ASSISTANT"] } }, orderBy: { createdAt: "asc" }, take: 30 } },
    }),
    refreshRecommendations(user.id),
  ]);
  return (
    <TutorChat
      level={levelLabel(user.englishLevel)}
      recommendation={recommendations[0]?.suggestion ?? null}
      initialSessionId={active?.id ?? null}
      initialMessages={(active?.messages ?? []).map((msg) => ({ id: msg.id, role: msg.role, content: msg.content }))}
    />
  );
}
