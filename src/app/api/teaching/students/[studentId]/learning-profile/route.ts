import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { updateStudentLearningProfile } from "@/lib/learning/level-service";

const schema = z.object({
  currentLevelCode: z.string().min(1).max(80),
  targetLevelCode: z.string().max(80).nullable(),
  courseId: z.string().nullable(),
  learningPace: z.enum(["GENTLE", "STANDARD", "INTENSIVE"]),
  dailyGoalMinutes: z.number().int().min(5).max(120),
  reason: z.string().trim().min(8).max(300),
}).strict();

interface Ctx { params: { studentId: string } }

export const PATCH = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["TEACHER", "ADMIN"]);
  const input = schema.parse(await parseJsonBody(req));
  return jsonOk(await updateStudentLearningProfile(viewer, ctx.params.studentId, input));
});
