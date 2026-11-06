import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createNote } from "@/lib/teaching/service";

const schema = z
  .object({
    scope: z.enum(["STUDENT", "GROUP", "SESSION"]),
    studentId: z.string().optional(),
    groupId: z.string().optional(),
    sessionId: z.string().optional(),
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = schema.parse(await parseJsonBody(req));
  const note = await createNote({ id: user.id, role: user.role, groupId: user.groupId }, body);
  return jsonOk({ id: note.id }, 201);
});
