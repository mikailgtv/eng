import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { assignedGroupIds } from "@/lib/teaching/access";
import { fillBlankConfig } from "@/lib/activities/schemas";

export async function listReviewItems(viewer: { id: string; role: string }) {
  const ids = await assignedGroupIds(viewer);
  return prisma.aiGeneratedItem.findMany({
    where: ids === null ? {} : { groupId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { lesson: { select: { title: true } }, student: { select: { firstName: true } } },
  });
}

export async function reviewItem(viewer: { id: string; role: string }, itemId: string, input: { status: "APPROVED" | "REJECTED"; prompt?: string }) {
  const item = await loadItem(viewer, itemId);
  if (item.status === "PUBLISHED") throw new ApiError(422, "Published practice cannot be reviewed again here.");
  const updated = await prisma.aiGeneratedItem.update({
    where: { id: item.id },
    data: {
      status: input.status,
      prompt: input.prompt?.trim() || item.prompt,
      reviewedById: viewer.id,
      reviewedAt: new Date(),
    },
  });
  await audit({ actorId: viewer.id, action: "AI_CONTENT_REVIEWED", entityType: "AI", entityId: item.id, metadata: { status: input.status } });
  return updated;
}

export async function publishItem(viewer: { id: string; role: string }, itemId: string) {
  const item = await loadItem(viewer, itemId);
  if (item.status !== "APPROVED") throw new ApiError(422, "Approve the practice before adding it to a lesson.");
  if (!item.lessonId || !item.answer) throw new ApiError(422, "This item has no lesson or answer to publish.");
  const sentence = item.prompt.includes("___") ? item.prompt.split("\n").find((line) => line.includes("___")) ?? item.prompt : `___ ${item.prompt}`;
  const config = fillBlankConfig.parse({
    sentenceWithBlank: sentence.includes("___") ? sentence : `Complete: ___ (${item.prompt.slice(0, 80)})`,
    acceptedAnswers: [item.answer],
    explanation: "Published by a teacher from AI Practice. This is practice, not an exam.",
  });
  const last = await prisma.activity.findFirst({ where: { lessonId: item.lessonId }, orderBy: { order: "desc" } });
  const activity = await prisma.activity.create({
    data: {
      lessonId: item.lessonId,
      type: "FILL_BLANK",
      title: `AI Practice: ${item.prompt.replace(/\s+/g, " ").slice(0, 70)}`,
      instructions: "Practice added by your teacher. It is not an exam.",
      order: (last?.order ?? 0) + 1,
      required: false,
      status: "PUBLISHED",
      configuration: JSON.stringify(config),
    },
  });
  await prisma.aiGeneratedItem.update({ where: { id: item.id }, data: { status: "PUBLISHED", reviewedById: viewer.id, reviewedAt: new Date() } });
  await audit({ actorId: viewer.id, action: "AI_CONTENT_PUBLISHED", entityType: "AI", entityId: item.id, metadata: { activityId: activity.id, lessonId: item.lessonId } });
  return activity;
}

async function loadItem(viewer: { id: string; role: string }, itemId: string) {
  const item = await prisma.aiGeneratedItem.findUnique({ where: { id: itemId } });
  if (!item) throw new ApiError(404, "Practice item not found.");
  const ids = await assignedGroupIds(viewer);
  if (ids !== null && (!item.groupId || !ids.includes(item.groupId))) throw new ApiError(404, "Practice item not found.");
  return item;
}
