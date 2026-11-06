import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { assertCourseEdit } from "./access";
import type { SessionUser } from "@/types";

export async function exportCourse(actor: SessionUser, courseId: string, format: "json" | "csv") {
  await assertCourseEdit(actor, courseId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      level: { select: { code: true } },
      modules: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" } }, lessons: { orderBy: { order: "asc" }, include: { blocks: { orderBy: { order: "asc" } } } } } },
    },
  });
  if (!course) throw new ApiError(404, "Course not found.");
  if (format === "csv") {
    const lines = ["module,unit,lesson,status,blockType"];
    for (const mod of course.modules) {
      const unit = mod.units[0]?.title ?? "";
      for (const lesson of mod.lessons) {
        if (lesson.blocks.length === 0) lines.push([mod.title, unit, lesson.title, lesson.status, ""].map(csv).join(","));
        for (const block of lesson.blocks) lines.push([mod.title, unit, lesson.title, lesson.status, block.type].map(csv).join(","));
      }
    }
    return { format: "csv", filename: `${course.code}.csv`, body: lines.join("\n") };
  }
  return {
    format: "json",
    filename: `${course.code}.json`,
    body: JSON.stringify({
      title: course.title,
      level: course.level.code,
      goal: course.goal,
      modules: course.modules.map((mod) => ({
        title: mod.title,
        units: mod.units.map((unit) => ({ title: unit.title, goal: unit.goal })),
        lessons: mod.lessons.map((lesson) => ({
          title: lesson.title,
          status: lesson.status,
          blocks: lesson.blocks.map((block) => ({ type: block.type, data: JSON.parse(block.data) })),
        })),
      })),
    }, null, 2),
  };
}

function csv(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export async function importCourseJson(actor: SessionUser, courseId: string, raw: string) {
  await assertCourseEdit(actor, courseId);
  let parsed: { modules?: { title?: string; lessons?: { title?: string }[] }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "The file is not valid JSON.");
  }
  if (!Array.isArray(parsed.modules)) throw new ApiError(400, "The file has no modules.");
  let created = 0;
  for (const mod of parsed.modules) {
    if (!mod.title) continue;
    const last = await prisma.module.findFirst({ where: { courseId }, orderBy: { order: "desc" } });
    const moduleRow = await prisma.module.create({ data: { courseId, title: mod.title.slice(0, 200), order: (last?.order ?? 0) + 1, status: "DRAFT" } });
    for (const lesson of mod.lessons ?? []) {
      if (!lesson.title) continue;
      await prisma.lesson.create({ data: { moduleId: moduleRow.id, title: lesson.title.slice(0, 200), order: created, status: "DRAFT", workflowStatus: "DRAFT", createdById: actor.id } });
      created += 1;
    }
  }
  return { created, note: "Imported rows are drafts. They are not published." };
}
