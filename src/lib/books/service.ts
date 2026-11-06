import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { assignedGroupIds } from "@/lib/teaching/access";

type StaffViewer = { id: string; role: string; groupId: string | null };

async function actorOrganization(viewer: StaffViewer) {
  if (viewer.role !== "TEACHER" && viewer.role !== "ADMIN") throw new ApiError(403, "Not authorized.");
  const actor = await prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true } });
  if (!actor) throw new ApiError(401, "Session user not found.");
  if (viewer.role === "TEACHER" && !actor.organizationId) throw new ApiError(403, "An organization-scoped teacher account is required.");
  return actor.organizationId;
}

export async function listBooks(viewer: StaffViewer) {
  const organizationId = await actorOrganization(viewer);
  return prisma.book.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      OR: [{ status: "ACTIVE" }, { createdById: viewer.id }],
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true, title: true, author: true, publisher: true, edition: true, isbn: true,
      language: true, levelCode: true, description: true, status: true, createdAt: true,
      _count: { select: { nodes: true } },
    },
  });
}

export async function createBook(viewer: StaffViewer, input: {
  title: string; author?: string | null; publisher?: string | null; edition?: string | null;
  isbn?: string | null; language: string; levelCode?: string | null; description?: string | null;
}) {
  const organizationId = await actorOrganization(viewer);
  if (input.levelCode) {
    const level = await prisma.level.findFirst({ where: { code: input.levelCode, status: "ACTIVE", OR: [{ organizationId }, { organizationId: null }] }, select: { code: true } });
    if (!level) throw new ApiError(422, "Choose a level available to this organization.");
  }
  const book = await prisma.book.create({
    data: {
      title: input.title.trim(), author: input.author?.trim() || null, publisher: input.publisher?.trim() || null,
      edition: input.edition?.trim() || null, isbn: input.isbn?.trim() || null, language: input.language,
      levelCode: input.levelCode || null, description: input.description?.trim() || null,
      organizationId, createdById: viewer.id, status: "DRAFT",
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });
  await prisma.bookVersion.create({ data: { bookId: book.id, version: 1, snapshot: JSON.stringify(input), note: "Initial draft" } });
  await audit({ actorId: viewer.id, action: "BOOK_DRAFT_CREATED", entityType: "CONTENT", entityId: book.id, metadata: { levelCode: input.levelCode ?? null } });
  return book;
}

export async function listBookNodes(viewer: StaffViewer, bookId: string) {
  const organizationId = await actorOrganization(viewer);
  const book = await prisma.book.findFirst({
    where: { id: bookId, ...(organizationId ? { organizationId } : {}), ...(viewer.role === "TEACHER" ? { OR: [{ status: "ACTIVE" }, { createdById: viewer.id }] } : {}) },
    select: { id: true },
  });
  if (!book) throw new ApiError(404, "Book not found.");
  return prisma.bookContentNode.findMany({ where: { bookId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, parentId: true, nodeType: true, title: true, sortOrder: true, status: true, contentJson: true, mappedCourseId: true, mappedModuleId: true, mappedLessonId: true } });
}

export async function createBookNode(viewer: StaffViewer, bookId: string, input: {
  parentId?: string | null; nodeType: "CHAPTER" | "UNIT" | "LESSON" | "SECTION" | "EXERCISE" | "QUIZ";
  title: string; sortOrder: number; contentJson?: string | null; mappedCourseId?: string | null;
  mappedModuleId?: string | null; mappedLessonId?: string | null; mappedActivityId?: string | null;
}) {
  const organizationId = await actorOrganization(viewer);
  const book = await prisma.book.findFirst({
    where: { id: bookId, ...(organizationId ? { organizationId } : {}), ...(viewer.role === "TEACHER" ? { createdById: viewer.id } : {}) },
    select: { id: true, status: true, organizationId: true },
  });
  if (!book) throw new ApiError(404, "Book not found.");
  if (book.status !== "DRAFT") throw new ApiError(409, "Only a draft book can be edited.");
  if (input.parentId) {
    const parent = await prisma.bookContentNode.findFirst({ where: { id: input.parentId, bookId }, select: { id: true } });
    if (!parent) throw new ApiError(404, "Parent node not found in this book.");
  }
  const allowedGroups = viewer.role === "ADMIN" ? null : await assignedGroupIds(viewer);
  if (input.mappedCourseId) {
    const course = await prisma.course.findFirst({ where: { id: input.mappedCourseId, status: "PUBLISHED" }, select: { id: true, assignments: { select: { groupId: true } } } });
    if (!course || (allowedGroups !== null && !course.assignments.some((a) => allowedGroups.includes(a.groupId)))) throw new ApiError(404, "Course not found.");
  }
  if (input.mappedModuleId) {
    const module = await prisma.module.findUnique({ where: { id: input.mappedModuleId }, select: { id: true, course: { select: { assignments: { select: { groupId: true } } } } } });
    if (!module || (allowedGroups !== null && !module.course.assignments.some((a) => allowedGroups.includes(a.groupId)))) throw new ApiError(404, "Module not found.");
  }
  if (input.mappedLessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: input.mappedLessonId }, select: { id: true, module: { select: { course: { select: { assignments: { select: { groupId: true } } } } } } } });
    if (!lesson || (allowedGroups !== null && !lesson.module.course.assignments.some((a) => allowedGroups.includes(a.groupId)))) throw new ApiError(404, "Lesson not found.");
  }
  if (input.mappedActivityId) {
    const activity = await prisma.activity.findUnique({ where: { id: input.mappedActivityId }, select: { id: true, lesson: { select: { module: { select: { course: { select: { assignments: { select: { groupId: true } } } } } } } } } });
    if (!activity || (allowedGroups !== null && !activity.lesson.module.course.assignments.some((a) => allowedGroups.includes(a.groupId)))) throw new ApiError(404, "Activity not found.");
  }
  const node = await prisma.bookContentNode.create({
    data: {
      bookId, parentId: input.parentId || null, nodeType: input.nodeType, title: input.title.trim(),
      sortOrder: input.sortOrder, contentJson: input.contentJson || null, status: "DRAFT",
      mappedCourseId: input.mappedCourseId || null, mappedModuleId: input.mappedModuleId || null,
      mappedLessonId: input.mappedLessonId || null, mappedActivityId: input.mappedActivityId || null,
    },
    select: { id: true, bookId: true, parentId: true, nodeType: true, title: true, sortOrder: true, status: true },
  });
  await audit({ actorId: viewer.id, action: "BOOK_STRUCTURE_NODE_CREATED", entityType: "CONTENT", entityId: bookId, metadata: { nodeId: node.id, nodeType: node.nodeType } });
  return node;
}
