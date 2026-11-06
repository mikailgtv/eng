import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/types";
import { sanitizeContent } from "./rules";

/**
 * AI drafts are never published by the model.
 * If no content provider is configured, the draft stores the prompt only.
 */
export async function createAiDraft(actor: SessionUser, input: { prompt: string; kind: string; lessonId?: string | null }) {
  const prompt = sanitizeContent(input.prompt);
  if (prompt.length < 8) throw new ApiError(400, "Describe what the draft should contain.");
  const provider = process.env.AI_CONTENT_PROVIDER;
  let body = "";
  let providerUsed = false;
  if (provider === "webhook" && process.env.AI_CONTENT_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.AI_CONTENT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, kind: input.kind }),
      });
      if (response.ok) {
        const json = await response.json() as { text?: string };
        body = sanitizeContent(json.text ?? "");
        providerUsed = Boolean(body);
      }
    } catch {
      providerUsed = false;
    }
  }
  if (!body) {
    body = "No model response was produced. Edit this AI draft before review. Do not publish it as official content until a teacher has checked it.";
  }
  const draft = await prisma.contentAiDraft.create({
    data: { prompt, body, kind: input.kind || "VOCABULARY", authorId: actor.id, lessonId: input.lessonId || null, providerUsed, labeled: true, status: "DRAFT" },
  });
  await audit({ actorId: actor.id, action: "AI_DRAFT_CREATED", entityType: "CONTENT", entityId: draft.id, metadata: { providerUsed, kind: draft.kind } });
  return { id: draft.id, body: draft.body, labeled: true, providerUsed, status: "AI Draft" };
}

export async function reviewAiDraft(actor: SessionUser, id: string, input: { body?: string; status: "REVIEWED" | "REJECTED" }) {
  const draft = await prisma.contentAiDraft.findUnique({ where: { id } });
  if (!draft || (actor.role === "TEACHER" && draft.authorId !== actor.id && !(await prisma.user.findUnique({ where: { id: actor.id }, select: { contentReviewer: true } }))?.contentReviewer)) {
    throw new ApiError(404, "Draft not found.");
  }
  const updated = await prisma.contentAiDraft.update({
    where: { id },
    data: { body: input.body ? sanitizeContent(input.body) : draft.body, status: input.status },
  });
  await audit({ actorId: actor.id, action: "AI_DRAFT_REVIEWED", entityType: "CONTENT", entityId: id, metadata: { status: input.status } });
  return updated;
}
