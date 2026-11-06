import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { assertContentRate, assertStaffContent } from "@/lib/content/access";
import { createModule, createUnit, saveObjective, savePrerequisite, saveRelease, saveSkillMapping } from "@/lib/content/service";

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  await assertContentRate(user.id);
  await assertStaffContent(user);
  const body = await parseJsonBody(req) as {
    action?: string;
    courseId?: string;
    moduleId?: string;
    title?: string;
    goal?: string;
    description?: string;
    resourceType?: string;
    resourceId?: string;
    text?: string;
    primarySkill?: string;
    secondarySkill?: string;
    requiredType?: string;
    requiredId?: string;
    mode?: string;
    releaseAt?: string;
    afterId?: string;
    released?: boolean;
  };
  if (body.action === "module" && body.courseId && body.title) return jsonOk(await createModule(user, { courseId: body.courseId, title: body.title, description: body.description, goal: body.goal }), 201);
  if (body.action === "unit" && body.moduleId && body.title) return jsonOk(await createUnit(user, { moduleId: body.moduleId, title: body.title, goal: body.goal, description: body.description }), 201);
  if (body.action === "objective" && body.resourceType && body.resourceId && body.text) return jsonOk(await saveObjective(user, { resourceType: body.resourceType, resourceId: body.resourceId, text: body.text }), 201);
  if (body.action === "skill" && body.resourceType && body.resourceId && body.primarySkill) return jsonOk(await saveSkillMapping(user, { resourceType: body.resourceType, resourceId: body.resourceId, primarySkill: body.primarySkill, secondarySkill: body.secondarySkill }));
  if (body.action === "prerequisite" && body.resourceType && body.resourceId && body.requiredType && body.requiredId) {
    return jsonOk(await savePrerequisite(user, { resourceType: body.resourceType, resourceId: body.resourceId, requiredType: body.requiredType, requiredId: body.requiredId }), 201);
  }
  if (body.action === "release" && body.resourceType && body.resourceId && body.mode) {
    return jsonOk(await saveRelease(user, { resourceType: body.resourceType, resourceId: body.resourceId, mode: body.mode, releaseAt: body.releaseAt, afterId: body.afterId, released: body.released }));
  }
  throw new ApiError(400, "Choose a content action.");
});
