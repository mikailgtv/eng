/**
 * EnglishBridge LMS — DEVELOPMENT SEED DATA
 *
 * ⚠️  DEVELOPMENT / DEMO ONLY.
 * These accounts exist so the app can be explored locally. All passwords are
 * well-known demo passwords. NEVER run this seed against a production
 * database — the script refuses to run when NODE_ENV=production unless
 * ALLOW_DEMO_SEED=true is set explicitly.
 *
 * Development-only demo credentials are surfaced from a server-only module
 * on the login page when NEXT_PUBLIC_DEMO_HINTS=true; they are not in client source.
 *   Admin:    username "admin"            password "Admin#Demo1"
 *   Teacher:  username "sara.whitfield"   password "Teacher#Demo1"
 *   Student:  username "james.carter"     password "Student#Demo1"
 *
 * Run: npm run db:seed   (or npm run db:reset to recreate + seed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_COURSES, SEED_LEVELS } from "./curriculum";
import { seedActivities } from "./seed-activities";
import { seedAssessments } from "./seed-assessments";
import { seedPhase20DemoCurriculum } from "./phase20-demo-curriculum";
import { assertDisposableSandboxTarget } from "./safe-seed-target";

try { assertDisposableSandboxTarget(); }
catch (error) { console.error(error instanceof Error ? error.message : "Unsafe seed target."); process.exit(1); }
import type { SeedCourse, SeedLesson } from "./curriculum";

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("REFUSING to seed: development demo seed must not run in production.");
  process.exit(1);
}

const BCRYPT_ROUNDS = 12;

const DEMO_PASSWORDS = {
  ADMIN: "Admin#Demo1",
  TEACHER: "Teacher#Demo1",
  STUDENT: "Student#Demo1",
} as const;

async function upsertUser(input: {
  username: string;
  email: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  status?: "ACTIVE" | "INACTIVE";
  englishLevel?: string | null;
  groupName?: string | null;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORDS[input.role], BCRYPT_ROUNDS);
  const group = input.groupName
    ? await prisma.learningGroup.findUnique({ where: { name: input.groupName } })
    : null;
  if (input.groupName && !group) throw new Error(`Seed group not found: ${input.groupName}`);

  return prisma.user.upsert({
    where: { username: input.username },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      employeeCode: input.employeeCode,
      email: input.email,
      role: input.role,
      status: input.status ?? "ACTIVE",
      englishLevel: input.englishLevel ?? null,
      groupId: group?.id ?? null,
      passwordHash,
    },
    create: {
      username: input.username,
      email: input.email,
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      status: input.status ?? "ACTIVE",
      englishLevel: input.englishLevel ?? null,
      groupId: group?.id ?? null,
      passwordHash,
    },
  });
}

async function upsertGroup(input: {
  name: string;
  type: "FIREFIGHTER_SHIFT" | "DAY_WORKER";
  description: string;
  teacherUsername?: string;
}) {
  const teacher = input.teacherUsername
    ? await prisma.user.findUnique({ where: { username: input.teacherUsername } })
    : null;
  if (input.teacherUsername && !teacher) throw new Error(`Seed teacher not found: ${input.teacherUsername}`);

  return prisma.learningGroup.upsert({
    where: { name: input.name },
    update: { type: input.type, description: input.description, teacherId: teacher?.id ?? null },
    create: {
      name: input.name,
      type: input.type,
      description: input.description,
      teacherId: teacher?.id ?? null,
    },
  });
}

/**
 * Seed the curriculum (levels + courses + modules + lessons + content).
 * Idempotent: a course that already exists (by code) is skipped, so re-running
 * the seed never destroys real student progress. Use `npm run db:reset` for a
 * full wipe + recreate.
 *
 * NOTE: no student progress is seeded — progress must always come from real
 * student activity, never fabricated data.
 */
async function seedCourse(course: SeedCourse): Promise<boolean> {
  const existing = await prisma.course.findUnique({ where: { code: course.code } });
  if (existing) {
    console.log(`  = course "${course.title}" already seeded (skipped)`);
    return false;
  }
  const level = await prisma.level.findUnique({ where: { code: course.levelCode } });
  if (!level) throw new Error(`Level not found: ${course.levelCode}`);

  await prisma.course.create({
    data: {
      code: course.code,
      title: course.title,
      description: course.description,
      levelId: level.id,
      status: "PUBLISHED",
      modules: {
        create: course.modules.map((module, mi) => ({
          title: module.title,
          description: module.description,
          order: mi + 1,
          status: "PUBLISHED",
          lessons: {
            create: module.lessons.map((lesson: SeedLesson, li: number) => ({
              title: lesson.title,
              description: lesson.description,
              objectives: JSON.stringify(lesson.objectives),
              durationMin: lesson.durationMin,
              order: li + 1,
              status: "PUBLISHED",
              blocks: {
                create: lesson.blocks.map((block, bi) => ({
                  type: block.type,
                  order: bi + 1,
                  data: JSON.stringify(block),
                })),
              },
              vocabulary: {
                create: (lesson.vocabulary ?? []).map((v, vi) => ({
                  word: v.word,
                  translation: v.translation,
                  pronunciation: v.pronunciation,
                  phonetic: v.phonetic,
                  exampleSentence: v.exampleSentence,
                  order: vi + 1,
                })),
              },
              grammar: lesson.grammar
                ? {
                    create: {
                      title: lesson.grammar.title,
                      explanation: lesson.grammar.explanation,
                      patterns: JSON.stringify(lesson.grammar.patterns),
                      examples: JSON.stringify(lesson.grammar.examples),
                      order: 1,
                    },
                  }
                : undefined,
            })),
          },
        })),
      },
    },
  });
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  console.log(`  ✓ course "${course.title}": ${course.modules.length} modules, ${lessonCount} lessons`);
  return true;
}

async function main() {
  console.log("Seeding development demo data…");

  // ----- Levels (Pre-A1 active, others prepared for the future) -------------
  for (const level of SEED_LEVELS) {
    await prisma.level.upsert({
      where: { code: level.code },
      update: {
        name: level.name,
        displayName: level.displayName,
        description: level.description,
        order: level.order,
        status: level.status,
      },
      create: { ...level },
    });
  }
  console.log(`  ✓ ${SEED_LEVELS.length} levels (Pre-A1 active)`);

  // ----- Admin + teacher first (groups reference the teacher) -----------------
  await upsertUser({
    username: "admin",
    email: "admin@demo.example",
    employeeCode: "ADM-0001",
    firstName: "Alex",
    lastName: "Morgan",
    role: "ADMIN",
  });

  await upsertUser({
    username: "sara.whitfield",
    email: "sara.whitfield@demo.example",
    employeeCode: "TCH-1001",
    firstName: "Sara",
    lastName: "Whitfield",
    role: "TEACHER",
  });

  // ----- Learning groups (the five initial organizational groups) -----------
  const shiftA = await upsertGroup({
    name: "Firefighter Shift A",
    type: "FIREFIGHTER_SHIFT",
    description: "English training group for Shift A firefighters.",
    teacherUsername: "sara.whitfield",
  });
  const shiftB = await upsertGroup({
    name: "Firefighter Shift B",
    type: "FIREFIGHTER_SHIFT",
    description: "English training group for Shift B firefighters.",
    teacherUsername: "sara.whitfield",
  });
  await upsertGroup({
    name: "Firefighter Shift C",
    type: "FIREFIGHTER_SHIFT",
    description: "English training group for Shift C firefighters.",
  });
  await upsertGroup({
    name: "Firefighter Shift D",
    type: "FIREFIGHTER_SHIFT",
    description: "English training group for Shift D firefighters.",
  });
  await upsertGroup({
    name: "Day Workers",
    type: "DAY_WORKER",
    description: "English training group for daytime personnel.",
  });
  console.log("  ✓ 5 learning groups");

  console.log("  ✓ 1 admin, 1 teacher");

  // ----- Students -------------------------------------------------------------
  const students = [
    { firstName: "James",   lastName: "Carter",    username: "james.carter",    code: "FF-A-101", group: shiftA.name, level: "PRE_A1" },
    { firstName: "Lena",    lastName: "Torres",    username: "lena.torres",     code: "FF-A-102", group: shiftA.name, level: "A1" },
    { firstName: "Omar",    lastName: "Haddad",    username: "omar.haddad",     code: "FF-A-103", group: shiftA.name, level: null },
    { firstName: "Viktor",  lastName: "Sokolov",   username: "viktor.sokolov",  code: "FF-A-104", group: shiftA.name, level: null, status: "INACTIVE" as const },
    { firstName: "Ivan",    lastName: "Petrov",    username: "ivan.petrov",     code: "FF-B-201", group: "Firefighter Shift B", level: "PRE_A1" },
    { firstName: "Mei",     lastName: "Chen",      username: "mei.chen",        code: "FF-B-202", group: "Firefighter Shift B", level: "A2" },
    { firstName: "Pedro",   lastName: "Alvarez",   username: "pedro.alvarez",   code: "FF-C-301", group: "Firefighter Shift C", level: null },
    { firstName: "Anna",    lastName: "Kowalski",  username: "anna.kowalski",   code: "FF-C-302", group: "Firefighter Shift C", level: "A1" },
    { firstName: "Fatima",  lastName: "Nouri",     username: "fatima.nouri",    code: "FF-D-401", group: "Firefighter Shift D", level: "PRE_A1" },
    { firstName: "Daniel",  lastName: "Kim",       username: "daniel.kim",      code: "DW-501",   group: "Day Workers", level: "B1" },
    { firstName: "Lucia",   lastName: "Fernandez", username: "lucia.fernandez", code: "DW-502",   group: "Day Workers", level: null },
  ];

  for (const s of students) {
    await upsertUser({
      username: s.username,
      email: `${s.username}@demo.example`,
      employeeCode: s.code,
      firstName: s.firstName,
      lastName: s.lastName,
      role: "STUDENT",
      status: s.status ?? "ACTIVE",
      englishLevel: s.level,
      groupName: s.group,
    });
  }
  console.log(`  ✓ ${students.length} students (incl. 1 deactivated demo account)`);

  // ----- Curriculum (real Pre-A1 content) -------------------------------------
  for (const course of SEED_COURSES) {
    await seedCourse(course);
  }

  // ----- Assign the course to every learning group ----------------------------
  const course = await prisma.course.findUnique({ where: { code: SEED_COURSES[0].code } });
  if (course) {
    const groups = await prisma.learningGroup.findMany({ select: { id: true } });
    let assigned = 0;
    for (const g of groups) {
      const exists = await prisma.courseAssignment.findFirst({
        where: { courseId: course.id, groupId: g.id },
        select: { id: true },
      });
      if (!exists) {
        await prisma.courseAssignment.create({ data: { courseId: course.id, groupId: g.id } });
        assigned += 1;
      }
    }
    if (assigned > 0) console.log(`  ✓ course assigned to ${assigned} learning group(s)`);
  }

  // ----- Phase 3: practice activities (validated, idempotent) ---------------
  const activityCount = await seedActivities(prisma);
  console.log(`  ✓ ${activityCount} practice activities seeded`);

  // ----- Phase 20: level-aware courses, profiles and original book mapping --
  const phase20 = await seedPhase20DemoCurriculum(prisma);
  console.log(`  ✓ Phase 20 demo curriculum: ${phase20.courses.length} level courses; book ${phase20.bookId}`);

  // ----- Phase 4: question bank + assessments (idempotent) ------------------
  const { questions, assessments } = await seedAssessments(prisma);
  console.log(`  ✓ ${questions} bank questions + ${assessments} assessments seeded`);

  const { seedTeaching } = await import("./seed-teaching");
  const teaching = await seedTeaching(prisma);
  console.log(`  ✓ teaching seed: ${teaching.sessions} class, ${teaching.assignments} assignment`);

  const listeningExists = await prisma.listeningExercise.findFirst({ where: { title: "Hello at the station" } });
  if (!listeningExists) {
    await prisma.listeningExercise.create({
      data: {
        title: "Hello at the station",
        levelCode: "PRE_A1",
        topic: "Greetings",
        transcript: "Hello. My name is Sam. I work at a fire station.",
        translation: "Bonjour. Je m'appelle Sam. Je travaille dans une caserne.",
        source: "SCRIPT",
        status: "PUBLISHED",
        questions: JSON.stringify([
          { id: "q1", type: "MC", prompt: "What is his name?", options: ["Sam", "Ali", "Sara"], answer: "Sam", explanation: "He says: My name is Sam." },
          { id: "q2", type: "TF", prompt: "He works at a fire station.", options: ["True", "False"], answer: "True", explanation: "The sentence says he works at a fire station." },
        ]),
      },
    });
    console.log("  ✓ listening script seeded (text only, no audio file)");
  }

  console.log("\nDevelopment demo accounts created. Sign-in hints are available only when local demo hints are enabled.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
