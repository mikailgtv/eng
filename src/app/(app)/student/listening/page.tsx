import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ListeningLab } from "@/components/voice/listening-lab";

export const metadata: Metadata = { title: "Listening" };

export default async function ListeningPage({ searchParams: rawSearchParams }: { searchParams?: Promise<{ lessonId?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  await requirePageUser(["STUDENT"]);
  const rows = await prisma.listeningExercise.findMany({
    where: {
      status: "PUBLISHED",
      ...(searchParams?.lessonId ? { OR: [{ lessonId: searchParams.lessonId }, { lessonId: null }] } : {}),
    },
    orderBy: { title: "asc" },
    take: 12,
  });
  return (
    <ListeningLab
      exercises={rows.map((row) => ({
        id: row.id,
        title: row.title,
        topic: row.topic,
        levelCode: row.levelCode,
        transcript: row.transcript,
        translation: row.translation,
        questions: JSON.parse(row.questions),
      }))}
    />
  );
}
