import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { requireAssessmentPermission } from "@/lib/assessment/intelligence/access";
import { saveBlueprint, validateBlueprint } from "@/lib/assessment/intelligence/blueprint";
import { buildVariants } from "@/lib/assessment/intelligence/variants";
import { SKILLS, DIFFICULTIES } from "@/lib/assessment/registry";

const blueprintSchema = z.object({
  title: z.string().trim().min(1).max(200),
  assessmentType: z.string().min(1),
  courseId: z.string().trim().optional(),
  levelId: z.string().trim().optional(),
  moduleId: z.string().trim().optional(),
  unitId: z.string().trim().optional(),
  questionCount: z.number().int().min(1).max(100),
  timeLimitMinutes: z.number().int().min(1).max(300).nullable().optional(),
  passingScore: z.number().int().min(1).max(100).default(70),
  attemptLimit: z.number().int().min(1).max(20).nullable().optional(),
  sections: z.array(z.object({
    skill: z.enum(SKILLS),
    percent: z.number().min(0).max(100),
    required: z.boolean().optional(),
  })).min(1),
  difficulty: z.object({
    EASY: z.number().min(0).max(100),
    MEDIUM: z.number().min(0).max(100),
    HARD: z.number().min(0).max(100),
  }),
  objectives: z.array(z.string().trim()).optional(),
  secureMode: z.boolean().optional(),
  retakePolicy: z.record(z.unknown()).optional(),
  validateOnly: z.boolean().optional(),
}).strict();

export const POST = apiRoute(async (req) => {
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  assertSameOrigin(req);
  await requireAssessmentPermission(user, "assessments.manage");
  const payload = blueprintSchema.parse(await parseJsonBody(req));
  if (payload.validateOnly) {
    const check = await validateBlueprint(payload);
    return jsonOk(check);
  }
  const result = await saveBlueprint(user.id, payload);
  return jsonOk(result, 201);
});
