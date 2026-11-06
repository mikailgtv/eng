import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";

const schema = z.object({ accept: z.boolean() }).strict();

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["STUDENT"]);
  const consent = await prisma.voiceConsent.findFirst({ where: { studentId: user.id, revokedAt: null }, orderBy: { acceptedAt: "desc" } });
  return jsonOk({ accepted: Boolean(consent), storeAudio: false });
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["STUDENT"]);
  const body = schema.parse(await parseJsonBody(req));
  if (!body.accept) {
    await prisma.voiceConsent.updateMany({ where: { studentId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return jsonOk({ accepted: false });
  }
  await prisma.voiceConsent.create({ data: { studentId: user.id, storeAudio: false } });
  return jsonOk({ accepted: true, storeAudio: false }, 201);
});
