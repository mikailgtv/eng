import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { setLessonStatus } from "@/lib/teaching/service";

const schema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }).strict();

export const PATCH = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const lesson = await setLessonStatus({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body.status);
  return jsonOk({ id: lesson.id, status: lesson.status });
});
