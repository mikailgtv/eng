import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createBookNode, listBookNodes } from "@/lib/books/service";

const schema = z.object({
  parentId: z.string().nullable().optional(),
  nodeType: z.enum(["CHAPTER", "UNIT", "LESSON", "SECTION", "EXERCISE", "QUIZ"]),
  title: z.string().trim().min(1).max(180),
  sortOrder: z.number().int().min(0).max(10000),
  contentJson: z.string().max(100_000).nullable().optional(),
  mappedCourseId: z.string().nullable().optional(),
  mappedModuleId: z.string().nullable().optional(),
  mappedLessonId: z.string().nullable().optional(),
  mappedActivityId: z.string().nullable().optional(),
}).strict();

interface Ctx { params: { bookId: string } }
export const GET = apiRoute<Ctx>(async (_req, ctx) => {
  const viewer = await requireApiUser(["TEACHER", "ADMIN"]);
  return jsonOk({ nodes: await listBookNodes(viewer, ctx.params.bookId) });
});

export const POST = apiRoute<Ctx>(async (req, ctx) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["TEACHER", "ADMIN"]);
  const input = schema.parse(await parseJsonBody(req));
  return jsonOk({ node: await createBookNode(viewer, ctx.params.bookId, input) }, 201);
});
