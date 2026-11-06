import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { prisma } from "@/lib/prisma";

const policySchema = z.object({
  assessmentId: z.string().min(1),
  mode: z.enum(["NONE", "ONE", "TWO", "UNLIMITED", "WAIT", "REMEDIAL"]),
  waitDays: z.number().int().min(1).max(90).nullable().optional(),
  countsAs: z.enum(["LATEST", "HIGHEST", "TEACHER_APPROVED"]),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const payload = policySchema.parse(await parseJsonBody(req));
  const saved = await prisma.assessmentRetakePolicy.upsert({
    where: { assessmentId: payload.assessmentId },
    create: {
      assessmentId: payload.assessmentId,
      mode: payload.mode,
      waitDays: payload.waitDays ?? null,
      countsAs: payload.countsAs,
    },
    update: {
      mode: payload.mode,
      waitDays: payload.waitDays ?? null,
      countsAs: payload.countsAs,
    },
  });
  return jsonOk(saved);
});
