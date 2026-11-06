import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createLesson } from "@/lib/teaching/service";

const schema = z.object({ moduleId: z.string().min(1), title: z.string().trim().min(1).max(200) }).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const lesson = await createLesson({ id: user.id, role: user.role, groupId: user.groupId }, body);
  return jsonOk({ id: lesson.id }, 201);
});
