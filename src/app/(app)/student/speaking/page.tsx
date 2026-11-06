import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SPEAKING_TOPICS } from "@/lib/voice/topics";
import { SpeakingLab } from "@/components/voice/speaking-lab";

export const metadata: Metadata = { title: "Speaking" };

export default async function SpeakingPage({ searchParams: rawSearchParams }: { searchParams?: Promise<{ lessonId?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["STUDENT"]);
  const consent = await prisma.voiceConsent.findFirst({ where: { studentId: user.id, revokedAt: null } });
  const beginner = !user.englishLevel || user.englishLevel === "PRE_A1" || user.englishLevel === "A1";
  return (
    <SpeakingLab
      topics={SPEAKING_TOPICS.map((topic) => ({ id: topic.id, title: topic.title }))}
      beginner={beginner}
      lessonId={searchParams?.lessonId}
      accepted={Boolean(consent)}
    />
  );
}
