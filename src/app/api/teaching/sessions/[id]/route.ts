import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { cancelSession, endSession, setSessionLesson, startSession } from "@/lib/teaching/service";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["start", "end", "cancel"]) }).strict(),
  z.object({ action: z.literal("lesson"), lessonId: z.string().min(1) }).strict(),
]);

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const session = body.action === "lesson"
    ? await setSessionLesson(viewer, ctx.params.id, body.lessonId)
    : body.action === "start"
      ? await startSession(viewer, ctx.params.id)
      : body.action === "end"
        ? await endSession(viewer, ctx.params.id)
        : await cancelSession(viewer, ctx.params.id);
  return jsonOk({ id: session.id, status: session.status, actualStart: session.actualStart, actualEnd: session.actualEnd });
});
