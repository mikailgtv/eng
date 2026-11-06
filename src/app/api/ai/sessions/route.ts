import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { listOwnSessions, startTutorSession } from "@/lib/ai/service";

const schema = z.object({
  mode: z.string().min(1),
  difficulty: z.string().optional(),
  lessonId: z.string().optional(),
  showTranslation: z.boolean().optional(),
}).strict();

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["STUDENT"]);
  const sessions = await listOwnSessions(user.id);
  return jsonOk({ sessions });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  const result = await startTutorSession({ id: user.id, role: user.role, groupId: user.groupId }, body);
  return jsonOk(result, 201);
});
