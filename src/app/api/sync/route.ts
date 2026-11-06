import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { recordLearningEvent } from "@/lib/adaptive/events";

const syncItemSchema = z.object({
  operationId: z.string().min(1),
  entity: z.enum(["LEARNING_EVENT", "VOCABULARY_REVIEW", "PRACTICE_ATTEMPT", "LISTENING_ATTEMPT"]),
  action: z.string().min(1),
  payload: z.record(z.unknown()),
  createdAt: z.string(),
});

const syncBatchSchema = z.object({
  deviceId: z.string().optional(),
  items: z.array(syncItemSchema).max(50),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["STUDENT"]);
  assertSameOrigin(req);
  const body = syncBatchSchema.parse(await parseJsonBody(req));

  const results: { operationId: string; status: "SYNCED" | "DUPLICATE" | "REJECTED"; error?: string }[] = [];

  for (const item of body.items) {
    try {
      if (item.entity === "LEARNING_EVENT" || item.entity === "PRACTICE_ATTEMPT" || item.entity === "VOCABULARY_REVIEW") {
        const payload = item.payload;
        const eventRes = await recordLearningEvent({
          studentId: user.id,
          eventType: String(payload.eventType || "PRACTICE_COMPLETED"),
          sourceType: "OFFLINE_SYNC",
          sourceId: `offline:${item.operationId}`,
          skillCode: payload.skillCode ? String(payload.skillCode) : null,
          correct: typeof payload.correct === "boolean" ? payload.correct : null,
          payload: { ...payload, syncedAt: new Date().toISOString(), offlineCreated: item.createdAt },
        });

        results.push({
          operationId: item.operationId,
          status: eventRes.created ? "SYNCED" : "DUPLICATE",
        });
      } else {
        results.push({ operationId: item.operationId, status: "SYNCED" });
      }
    } catch {
      results.push({ operationId: item.operationId, status: "REJECTED", error: "Could not sync this item. Please retry." });
    }
  }

  return jsonOk({
    syncedAt: new Date().toISOString(),
    processedCount: results.length,
    results,
  });
});
