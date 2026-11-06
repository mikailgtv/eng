import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const url = process.env.DATABASE_URL!;
if (!url) throw new Error("DATABASE_URL required");
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const group = await prisma.learningGroup.findFirst();
  if (!group) throw new Error("no group");
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("no admin");
  const template = await prisma.user.findFirst({ where: { username: "james.carter" } });
  if (!template) throw new Error("no template user");
  // Get level/course/module/lesson
  const level = await prisma.level.findFirst({ where: { code: "A1" } });
  if (!level) throw new Error("no level");
  let course = await prisma.course.findFirst({ where: { levelId: level.id, status: "PUBLISHED" } });
  if (!course) throw new Error("no course");
  let mod = await prisma.module.findFirst({ where: { courseId: course.id } });
  if (!mod) throw new Error("no mod");
  let lessons = await prisma.lesson.findMany({ where: { moduleId: mod.id, status: "PUBLISHED" }, orderBy: { order: "asc" }, take: 5 });
  if (lessons.length === 0) throw new Error("no lessons");
  // Find speaking and MC activities
  let speakingAct = await prisma.activity.findFirst({ where: { type: "SPEAKING_PROMPT" } });
  if (!speakingAct) throw new Error("no speaking act");
  let mcAct = await prisma.activity.findFirst({ where: { type: { not: "SPEAKING_PROMPT" } } });

  const mkUser = async (username: string, first: string, email: string, code: string) => {
    let u = await prisma.user.findUnique({ where: { username } });
    if (u) return u;
    u = await prisma.user.create({
      data: {
        employeeCode: code,
        username,
        email,
        passwordHash: template.passwordHash,
        firstName: first,
        lastName: "P58",
        role: "STUDENT",
        status: "ACTIVE",
        groupId: group.id,
        organizationId: template.organizationId,
        englishLevel: "A1",
      },
    });
    return u;
  };

  const alice = await mkUser("p58.alice", "Alice", "p58.alice@test.example", "P58ALICE");
  const bob = await mkUser("p58.bob", "Bob", "p58.bob@test.example", "P58BOB");
  console.log(`users: alice=${alice.id} bob=${bob.id}`);

  // Ensure course assigned
  await prisma.courseAssignment.upsert({
    where: { courseId_groupId: { courseId: course.id, groupId: group.id } },
    create: { courseId: course.id, groupId: group.id },
    update: {},
  });

  // Clean previous P58 data
  await prisma.lessonProgress.deleteMany({ where: { studentId: { in: [alice.id, bob.id] } } });
  await prisma.activityAttempt.deleteMany({ where: { studentId: { in: [alice.id, bob.id] } } });
  await prisma.vocabularyReview.deleteMany({ where: { studentId: { in: [alice.id, bob.id] } } });
  await prisma.studentLearningPreference.deleteMany({ where: { studentId: { in: [alice.id, bob.id] } } });

  // Alice: 2 completed lessons, 1 in progress
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayLate = new Date(todayUTC.getTime() - 60 * 1000); // 23:59 yesterday
  const todayEarly = new Date(todayUTC.getTime() + 60 * 1000); // 00:01 today

  // Create lesson progress for Alice: lesson 0 at yesterdayLate, lesson 1 at todayEarly, lesson 2 not completed
  if (lessons[0]) await prisma.lessonProgress.create({ data: { studentId: alice.id, lessonId: lessons[0].id, status: "COMPLETED", startedAt: yesterdayLate, completedAt: yesterdayLate, lastAccessedAt: yesterdayLate } });
  if (lessons[1]) await prisma.lessonProgress.create({ data: { studentId: alice.id, lessonId: lessons[1].id, status: "COMPLETED", startedAt: todayEarly, completedAt: todayEarly, lastAccessedAt: todayEarly } });
  if (lessons[2]) await prisma.lessonProgress.create({ data: { studentId: alice.id, lessonId: lessons[2].id, status: "IN_PROGRESS", startedAt: now, lastAccessedAt: now } });

  // Vocab review: alice has 1 due, 1 not due
  let vocab = await prisma.vocabulary.findFirst({ where: { lessonId: lessons[0].id } });
  if (!vocab) {
    vocab = await prisma.vocabulary.create({ data: { lessonId: lessons[0].id, word: "p58word"+Date.now(), translation: "test", order: 0 } });
  }
  await prisma.vocabularyReview.create({
    data: { studentId: alice.id, vocabularyId: vocab.id, status: "REVIEW", correctCount: 1, incorrectCount: 0, lastReviewedAt: todayEarly, dueAt: new Date(Date.now() - 10000) },
  });
  // Another vocab not due
  let vocab2 = await prisma.vocabulary.findFirst({ where: { lessonId: lessons[1]?.id ?? lessons[0].id, id: { not: vocab.id } } });
  if (!vocab2) {
    vocab2 = await prisma.vocabulary.create({ data: { lessonId: lessons[1]?.id ?? lessons[0].id, word: "p58word2"+Date.now(), translation: "test2", order: 1 } });
  }
  await prisma.vocabularyReview.create({
    data: { studentId: alice.id, vocabularyId: vocab2.id, status: "LEARNING", correctCount: 1, lastReviewedAt: now, dueAt: new Date(Date.now() + 86400000) },
  });

  // Activity attempts: alice speaking (self-reported) + MC correct
  await prisma.activityAttempt.create({
    data: { studentId: alice.id, activityId: speakingAct.id, answer: JSON.stringify({ selfReported: true }), isCorrect: null, score: null, submittedAt: todayEarly, attemptNumber: 1 },
  });
  if (mcAct) {
    // Get config to make correct answer
    await prisma.activityAttempt.create({
      data: { studentId: alice.id, activityId: mcAct.id, answer: JSON.stringify({ optionId: "x" }), isCorrect: true, score: 1, submittedAt: now, attemptNumber: 1 },
    });
  }

  // Duplicate test: same activity within 60s should dedupe
  let fillAct = await prisma.activity.findFirst({ where: { lessonId: lessons[0].id, type: "FILL_BLANK" } });
  if (!fillAct) {
    fillAct = await prisma.activity.create({ data: { lessonId: lessons[0].id, type: "FILL_BLANK", title: "Dup", order: 99, status: "PUBLISHED", configuration: JSON.stringify({ sentenceWithBlank: "a ___", acceptedAnswers: ["b"] }) } });
  }
  const dupBase = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0));
  await prisma.activityAttempt.create({ data: { studentId: alice.id, activityId: fillAct.id, answer: JSON.stringify({ text: "b" }), isCorrect: true, score: 1, submittedAt: dupBase, attemptNumber: 1 } });
  await prisma.activityAttempt.create({ data: { studentId: alice.id, activityId: fillAct.id, answer: JSON.stringify({ text: "b" }), isCorrect: true, score: 1, submittedAt: new Date(dupBase.getTime() + 30_000), attemptNumber: 2 } });

  // Daily goal for alice: LESSONS 2 enabled
  await prisma.studentLearningPreference.create({ data: { studentId: alice.id, dailyMinutes: 10, dailyGoalType: "LESSONS", dailyGoalValue: 2, dailyGoalEnabled: true } });
  // Bob: default goal, no progress
  await prisma.studentLearningPreference.create({ data: { studentId: bob.id, dailyMinutes: 10, dailyGoalType: "LESSONS", dailyGoalValue: 1, dailyGoalEnabled: true } });

  // 7-day history: create lesson progress for last 7 days for alice
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 12, 0, 0));
    if (i === 3) {
      // Add extra vocab review on day -3
      await prisma.vocabularyReview.upsert({
        where: { studentId_vocabularyId: { studentId: alice.id, vocabularyId: vocab.id } },
        create: { studentId: alice.id, vocabularyId: vocab.id, status: "REVIEW", correctCount: 1, lastReviewedAt: d, dueAt: new Date(d.getTime() + 86400000) },
        update: { lastReviewedAt: d },
      });
      // Actually we need separate vocab for that day - create new vocab
      const v = await prisma.vocabulary.create({ data: { lessonId: lessons[0].id, word: "p58hist"+i+Date.now(), translation: "h", order: 10+i } });
      await prisma.vocabularyReview.create({ data: { studentId: alice.id, vocabularyId: v.id, status: "REVIEW", correctCount: 1, lastReviewedAt: d, dueAt: new Date(d.getTime()+86400000) } });
    }
  }

  console.log("setup done");
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e); process.exit(1)});
