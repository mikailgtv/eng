import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { createAnnouncement, visibleAnnouncements } from "@/lib/communication/announcements";

export const GET = apiRoute(async () => {
  const user = await requireApiUser();
  return jsonOk(await visibleAnnouncements(user));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["TEACHER", "ADMIN"]);
  const body = await parseJsonBody(req) as {
    title?: string;
    body?: string;
    announcementType?: string;
    priority?: string;
    publishAt?: string;
    expireAt?: string;
    href?: string;
    linkLabel?: string;
    courseId?: string;
    acknowledgementRequired?: boolean;
    confirm?: boolean;
    targets?: { targetType: string; targetId?: string }[];
  };
  if (body.confirm !== true) throw new ApiError(400, "Confirm this announcement before sending.");
  if (!body.title || !body.body || !body.announcementType || !body.publishAt || !body.targets) throw new ApiError(400, "Enter the announcement, time, and audience.");
  return jsonOk(await createAnnouncement(user, {
    title: body.title,
    body: body.body,
    announcementType: body.announcementType,
    priority: body.priority,
    publishAt: body.publishAt,
    expireAt: body.expireAt,
    href: body.href,
    linkLabel: body.linkLabel,
    courseId: body.courseId,
    acknowledgementRequired: body.acknowledgementRequired,
    targets: body.targets,
  }), 201);
});
