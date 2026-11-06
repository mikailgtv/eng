import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createPlan } from "@/lib/teaching/service";

const schema = z
  .object({
    groupId: z.string().min(1),
    lessonId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    moduleId: z.string().nullable().optional(),
    plannedDate: z.string().datetime({ offset: true }),
    plannedDurationMin: z.number().int().min(15).max(240).default(60),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const plan = await createPlan(
    { id: user.id, role: user.role, groupId: user.groupId },
    { ...body, plannedDate: new Date(body.plannedDate) }
  );
  return jsonOk({ id: plan.id }, 201);
});
