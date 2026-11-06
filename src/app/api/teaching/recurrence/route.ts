import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createRecurrence, generateSessions } from "@/lib/teaching/service";

const schema = z
  .object({
    groupId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    courseId: z.string().nullable().optional(),
    generate: z.boolean().optional(),
  })
  .strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const rule = await createRecurrence(viewer, body);
  const sessions = body.generate === false ? [] : await generateSessions(viewer, rule.id, 4);
  return jsonOk({ id: rule.id, sessions: sessions.length }, 201);
});
