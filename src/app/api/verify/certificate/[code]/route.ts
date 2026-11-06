import { apiRoute, jsonOk } from "@/lib/api";
import { publicVerification } from "@/lib/certificates/service";

export const GET = apiRoute(async (_req, ctx: { params: { code: string } }) => {
  return jsonOk(await publicVerification(ctx.params.code));
});
