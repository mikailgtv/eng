import { ApiError, apiRoute, assertSameOrigin, jsonOk, parseJsonBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { renderTemplate, validateTemplate } from "@/lib/communication/rules";

export const GET = apiRoute(async () => {
  const user = await requireApiUser(["ADMIN"]);
  const templates = await prisma.notificationTemplate.findMany({ orderBy: { name: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 5 } } });
  return jsonOk(templates.map((template) => ({
    id: template.id,
    key: template.key,
    name: template.name,
    category: template.category,
    subject: template.subject,
    body: template.body,
    active: template.active,
    version: template.version,
    versions: template.versions.map((version) => ({ version: version.version, subject: version.subject, createdAt: version.createdAt.toISOString() })),
  })));
});

export const POST = apiRoute(async (req) => {
  assertSameOrigin(req);
  const user = await requireApiUser(["ADMIN"]);
  const body = await parseJsonBody(req) as { key?: string; name?: string; category?: string; subject?: string; body?: string; active?: boolean; preview?: boolean; confirm?: boolean };
  if (!body.subject || !body.body) throw new ApiError(400, "Enter a subject and a message.");
  const error = validateTemplate(body.body, body.subject);
  if (error) throw new ApiError(400, error);
  if (body.preview) {
    return jsonOk({ preview: renderTemplate(body.body, { student_name: "Student", assignment_name: "Assignment", due_date: "1 Oct 2026 18:00 UTC", course_name: "Course", exam_name: "Exam", class_name: "Class", certificate_id: "CERT-2026-000184", group_name: "Group" }) });
  }
  if (body.confirm !== true || !body.key || !body.name || !body.category) throw new ApiError(400, "Confirm the template before saving.");
  const existing = await prisma.notificationTemplate.findUnique({ where: { key: body.key } });
  if (existing) {
    await prisma.notificationTemplateVersion.create({ data: { templateId: existing.id, version: existing.version, subject: existing.subject, body: existing.body, createdById: user.id } });
  }
  const template = await prisma.notificationTemplate.upsert({
    where: { key: body.key },
    create: { key: body.key, name: body.name, category: body.category, subject: body.subject, body: body.body, active: Boolean(body.active), version: 1 },
    update: { name: body.name, category: body.category, subject: body.subject, body: body.body, active: Boolean(body.active), version: { increment: 1 } },
  });
  await audit({ actorId: user.id, action: "NOTIFICATION_TEMPLATE_SAVED", entityType: "COMMUNICATION", entityId: template.id, metadata: { key: template.key, version: template.version, active: template.active } });
  return jsonOk({ id: template.id, version: template.version });
});
