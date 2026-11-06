import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createAssignment } from "@/lib/teaching/service";

const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    instructions: z.string().trim().max(4000).nullable().optional(),
    type: z.string().min(1),
    groupId: z.string().min(1),
    lessonId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    dueAt: z.string().datetime({ offset: true }),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    allowLate: z.boolean().optional(),
  })
  .strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const assignment = await createAssignment(
    { id: user.id, role: user.role, groupId: user.groupId },
    { ...body, dueAt: new Date(body.dueAt) }
  );
  return jsonOk({ id: assignment.id }, 201);
});
