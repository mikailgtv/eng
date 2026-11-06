import { z } from "zod";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createBook, listBooks } from "@/lib/books/service";

const schema = z.object({
  title: z.string().trim().min(2).max(180),
  author: z.string().trim().max(160).nullable().optional(),
  publisher: z.string().trim().max(160).nullable().optional(),
  edition: z.string().trim().max(60).nullable().optional(),
  isbn: z.string().trim().max(32).nullable().optional(),
  language: z.string().trim().min(2).max(12).default("en"),
  levelCode: z.string().max(80).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
}).strict();

export const GET = apiRoute(async () => {
  const viewer = await requireApiUser(["TEACHER", "ADMIN"]);
  return jsonOk({ books: await listBooks(viewer) });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const viewer = await requireApiUser(["TEACHER", "ADMIN"]);
  const input = schema.parse(await parseJsonBody(req));
  return jsonOk({ book: await createBook(viewer, input) }, 201);
});
