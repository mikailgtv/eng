import { prisma } from "@/lib/prisma";

export async function snapshotLesson(lessonId: string, authorId: string | null, changeNote: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!lesson || lesson.status !== "PUBLISHED") return null;
  const recent = await prisma.contentVersion.findFirst({
    where: { item: { usages: { some: { lessonId } } } },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 120_000 && recent.authorId === authorId) return recent;
  const item = await prisma.contentItem.create({
    data: {
      kind: "LESSON_SNAPSHOT",
      title: lesson.title,
      body: changeNote,
      status: "PUBLISHED",
      version: lesson.version,
      authorId,
      source: "TEACHER",
      usages: { create: { lessonId, placement: "VERSION" } },
    },
  });
  return prisma.contentVersion.create({
    data: {
      itemId: item.id,
      version: lesson.version,
      status: lesson.status,
      changeNote,
      authorId,
      snapshot: JSON.stringify({
        title: lesson.title,
        goal: lesson.goal,
        blocks: lesson.blocks.map((block) => ({ type: block.type, order: block.order, data: block.data, hidden: block.hidden })),
      }),
    },
  });
}

export async function snapshotCourse(courseId: string, authorId: string | null, changeNote: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" } }, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, status: true, order: true } } } } },
  });
  if (!course) return null;
  return prisma.courseVersion.create({
    data: {
      courseId,
      version: course.version,
      status: course.status,
      changeNote,
      authorId,
      snapshot: JSON.stringify({
        title: course.title,
        goal: course.goal,
        outcomes: course.outcomes,
        modules: course.modules.map((mod) => ({ title: mod.title, units: mod.units.map((unit) => unit.title), lessons: mod.lessons })),
      }),
    },
  });
}
