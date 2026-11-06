import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { preferenceView, savePreference, saveQuietHours } from "@/lib/communication/hub";

export const GET = apiRoute(async () => {
  const user = await requireApiUser();
  return jsonOk(await preferenceView(user.id));
});

/** 24-hour HH:MM, the format the preferences page and the digest job expect. */
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser();
  const body = await parseJsonBody(req) as { category?: string; inApp?: boolean; email?: boolean; push?: boolean; sms?: boolean; quietStart?: string; quietEnd?: string; timezone?: string };

  // Two separate saves share this endpoint: one notification category, or the
  // quiet-hours window. A request must carry one of them.
  const hasQuietHours = body.quietStart !== undefined || body.quietEnd !== undefined;
  if (!body.category && !hasQuietHours) throw new ApiError(400, "Choose a category.");

  if (!body.category) {
    const start = (body.quietStart ?? "").trim();
    const end = (body.quietEnd ?? "").trim();
    if ((start && !TIME_OF_DAY.test(start)) || (end && !TIME_OF_DAY.test(end))) {
      throw new ApiError(400, "Use 24-hour times like 22:00, or leave both fields empty.");
    }
    try {
      await saveQuietHours(user.id, { quietStart: body.quietStart, quietEnd: body.quietEnd });
    } catch {
      throw new ApiError(400, "Could not save quiet hours. Check your choices and try again.");
    }
    return jsonOk(await preferenceView(user.id));
  }

  try {
    await savePreference(user.id, {
      category: body.category,
      inApp: body.inApp !== false,
      email: Boolean(body.email),
      push: Boolean(body.push),
      sms: Boolean(body.sms),
      quietStart: body.quietStart,
      quietEnd: body.quietEnd,
      timezone: body.timezone,
    });
  } catch {
    throw new ApiError(400, "Could not save preferences. Check your choices and try again.");
  }
  return jsonOk(await preferenceView(user.id));
});
