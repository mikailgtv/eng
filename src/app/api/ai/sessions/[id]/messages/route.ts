import { z } from "zod";
import { apiRoute, assertSameOrigin, parseJsonBody, requireApiUser } from "@/lib/api";
import { sendTutorMessage } from "@/lib/ai/service";

const schema = z.object({ message: z.string() }).strict();

export const POST = apiRoute<{ params: { id: string } }>(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  const result = await sendTutorMessage({ id: user.id, role: user.role, groupId: user.groupId }, ctx.params.id, body.message);
  const encoder = new TextEncoder();
  const chunks = result.reply.text.match(/.{1,48}/gs) ?? [result.reply.text];
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "thinking" })}\n\n`));
      for (const chunk of chunks) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, ...result })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});
