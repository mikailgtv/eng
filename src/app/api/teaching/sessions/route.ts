import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createSession } from "@/lib/teaching/service";

const schema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  scheduledStart: z.string().datetime({ offset: true }),
  scheduledEnd: z.string().datetime({ offset: true }),
  courseId: z.string().nullable().optional(),
  moduleId: z.string().nullable().optional(),
  lessonId: z.string().nullable().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const session = await createSession(
    { id: user.id, role: user.role, groupId: user.groupId },
    {
      ...body,
      scheduledStart: new Date(body.scheduledStart),
      scheduledEnd: new Date(body.scheduledEnd),
    }
  );
  return jsonOk({ id: session.id }, 201);
});
