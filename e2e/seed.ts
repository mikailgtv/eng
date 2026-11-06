/**
 * Phase 32 — E2E staging fixture builder.
 *
 * Builds an ISOLATED copy of the development database and seeds TWO synthetic
 * organizations so cross-tenant (IDOR) behaviour can be exercised against the
 * real HTTP API routes.
 *
 * SAFETY:
 *  - The source database (prisma/dev.db) is only ever read (copy) — never written.
 *  - All records use the E2E_ prefix so they can be identified and removed.
 *  - No production credentials, no external services, no real learner data.
 */
import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/lib/identity/catalog";

const ROOT = process.cwd();
const SOURCE_DB = path.join(ROOT, "prisma", "dev.db");
const E2E_DIR = path.join(ROOT, "e2e");
/**
 * SEED_TARGET_DB lets the fixtures be built on top of an ALREADY-MIGRATED
 * database (Phase 33E/F). When set, the source copy step is skipped and the
 * schema is expected to be current.
 */
const EXTERNAL_TARGET = process.env.SEED_TARGET_DB ? path.resolve(process.env.SEED_TARGET_DB) : null;
const TARGET_DB = EXTERNAL_TARGET ?? path.join(E2E_DIR, "e2e.db");
/**
 * SEED_TARGET_URL targets a remote/other-provider database (e.g. the disposable
 * PostgreSQL staging DB). When set, no file copy happens and the SQLite-specific
 * column patching is skipped, because that schema is managed by real migrations.
 */
const EXTERNAL_URL = process.env.SEED_TARGET_URL ?? null;
const IS_POSTGRES = !!EXTERNAL_URL && /^postgres(ql):\/\//.test(EXTERNAL_URL);
const STORAGE_ROOT = path.join(E2E_DIR, "storage");

export const E2E_PASSWORD = "E2eOnly!Passw0rd#32";

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

async function main() {
  if (!existsSync(SOURCE_DB)) throw new Error("source dev.db missing");
  mkdirSync(E2E_DIR, { recursive: true });
  if (EXTERNAL_URL) {
    log(`seeding into externally managed database (${IS_POSTGRES ? "postgresql" : "other"}) — no copy, no DDL`);
  } else if (EXTERNAL_TARGET) {
    if (!existsSync(TARGET_DB)) throw new Error(`SEED_TARGET_DB not found: ${TARGET_DB}`);
    log(`seeding into pre-migrated database ${path.relative(ROOT, TARGET_DB)} (no copy, no schema change)`);
  } else {
    rmSync(TARGET_DB, { force: true });
    copyFileSync(SOURCE_DB, TARGET_DB);
    log(`copied source db -> ${path.relative(ROOT, TARGET_DB)} (source untouched)`);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: EXTERNAL_URL ?? `file:${TARGET_DB}` } },
  });

  // ---- Apply migrations that the real DB has never had --------------------
  // Phase 30 storage metadata + Phase 32 tenant isolation. These are the two
  // migrations whose SQL exists in the repo but which were never applied to
  // the development database (verified: P2022 column drift).
  if (IS_POSTGRES) {
    log("postgresql target: schema is managed by prisma/postgresql/migrations — skipping SQLite DDL");
    const applied = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS c FROM information_schema.tables WHERE table_schema='public' AND table_name='content_media'`
    ) as { c: number }[];
    if (!applied[0]?.c) throw new Error("content_media missing on the postgresql target — migrate first");
  }

  // SQLite-only schema patching. Skipped entirely for managed (postgresql) targets.
  const cols = async (table: string) =>
    new Set(((await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)) as { name: string }[]).map((r) => r.name));

  const contentCols = IS_POSTGRES ? new Set(["originalName"]) : await cols("content_media");
  const attachCols = IS_POSTGRES ? new Set(["originalName"]) : await cols("message_attachments");

  if (!contentCols.has("originalName")) {
    for (const stmt of [
      `ALTER TABLE "content_media" ADD COLUMN "originalName" TEXT`,
      `ALTER TABLE "content_media" ADD COLUMN "checksum" TEXT`,
      `ALTER TABLE "content_media" ADD COLUMN "storageProvider" TEXT DEFAULT 'local'`,
      `ALTER TABLE "content_media" ADD COLUMN "storageBucket" TEXT`,
      `ALTER TABLE "content_media" ADD COLUMN "accessLevel" TEXT DEFAULT 'RESTRICTED'`,
      `ALTER TABLE "content_media" ADD COLUMN "processingStatus" TEXT DEFAULT 'READY'`,
      `ALTER TABLE "content_media" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE "content_media" ADD COLUMN "replacedById" TEXT`,
      `ALTER TABLE "content_media" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "content_media" ADD COLUMN "organizationId" TEXT`,
    ]) await prisma.$executeRawUnsafe(stmt);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "content_media_checksum_idx" ON "content_media"("checksum")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "content_media_organizationId_idx" ON "content_media"("organizationId")`);
    log("applied phase30+phase32 columns to content_media (copy only)");
  }
  if (!attachCols.has("originalName")) {
    for (const stmt of [
      `ALTER TABLE "message_attachments" ADD COLUMN "originalName" TEXT`,
      `ALTER TABLE "message_attachments" ADD COLUMN "checksum" TEXT`,
      `ALTER TABLE "message_attachments" ADD COLUMN "storageProvider" TEXT DEFAULT 'local'`,
      `ALTER TABLE "message_attachments" ADD COLUMN "storageBucket" TEXT`,
      `ALTER TABLE "message_attachments" ADD COLUMN "accessLevel" TEXT DEFAULT 'PRIVATE'`,
      `ALTER TABLE "message_attachments" ADD COLUMN "processingStatus" TEXT DEFAULT 'READY'`,
      `ALTER TABLE "message_attachments" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1`,
      `ALTER TABLE "message_attachments" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ]) await prisma.$executeRawUnsafe(stmt);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "message_attachments_checksum_idx" ON "message_attachments"("checksum")`);
    log("applied phase30 columns to message_attachments (copy only)");
  }

  // ---- Clean previous E2E fixtures (idempotent re-runs) -------------------
  const oldOrgs = await prisma.organization.findMany({ where: { code: { startsWith: "E2E_" } }, select: { id: true } });
  if (oldOrgs.length) {
    const ids = oldOrgs.map((o) => o.id);
    const users = await prisma.user.findMany({ where: { organizationId: { in: ids } }, select: { id: true } });
    const uids = users.map((u) => u.id);
    // Remove dependent rows in FK-safe order
    await prisma.auditLog.deleteMany({ where: { actorId: { in: uids } } });
    await prisma.attendanceRecord.deleteMany({ where: { studentId: { in: uids } } });
    await prisma.classSession.deleteMany({ where: { teacherId: { in: uids } } });
    await prisma.assignmentSubmission.deleteMany({ where: { studentId: { in: uids } } });
    await prisma.assignment.deleteMany({ where: { teacherId: { in: uids } } });
    await prisma.assessmentAttempt.deleteMany({ where: { studentId: { in: uids } } });
    await prisma.assessment.deleteMany({ where: { createdById: { in: uids } } });
    await prisma.lessonProgress.deleteMany({ where: { studentId: { in: uids } } });
    await prisma.contentMedia.deleteMany({ where: { uploadedById: { in: uids } } });
    await prisma.messageAttachment.deleteMany({ where: { message: { senderId: { in: uids } } } });
    await prisma.message.deleteMany({ where: { senderId: { in: uids } } });
    await prisma.conversationParticipant.deleteMany({ where: { userId: { in: uids } } });
    await prisma.conversation.deleteMany({ where: { createdById: { in: uids } } });
    await prisma.userAccessRole.deleteMany({ where: { userId: { in: uids } } });
    await prisma.temporaryPermission.deleteMany({ where: { userId: { in: uids } } });
    await prisma.userOrganization.deleteMany({ where: { userId: { in: uids } } });
    await prisma.userSession.deleteMany({ where: { userId: { in: uids } } });
    await prisma.loginAttempt.deleteMany({ where: { userId: { in: uids } } });
    await prisma.accountSecurityEvent.deleteMany({ where: { userId: { in: uids } } });
    await prisma.teacherGroupAssignment.deleteMany({ where: { teacherId: { in: uids } } });
    await prisma.courseAssignment.deleteMany({ where: { group: { organizationId: { in: ids } } } });
    await prisma.lesson.deleteMany({ where: { module: { course: { level: { organizationId: { in: ids } } } } } });
    await prisma.module.deleteMany({ where: { course: { level: { organizationId: { in: ids } } } } });
    await prisma.course.deleteMany({ where: { level: { organizationId: { in: ids } } } });
    await prisma.learningGroup.deleteMany({ where: { organizationId: { in: ids } } });
    await prisma.level.deleteMany({ where: { organizationId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: uids } } });
    await prisma.rolePermission.deleteMany({ where: { role: { organizationId: { in: ids } } } });
    await prisma.accessRole.deleteMany({ where: { organizationId: { in: ids } } });
    await prisma.organizationSetting.deleteMany({ where: { organizationId: { in: ids } } });
    await prisma.organization.deleteMany({ where: { id: { in: ids } } });
    log(`removed ${ids.length} previous E2E orgs`);
  }

  // ---- Permissions + per-org access roles --------------------------------
  for (const [key, category, description] of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key, category, description } });
  }
  const permRows = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permId = new Map(permRows.map((p) => [p.key, p.id]));
  log(`permissions: ${permRows.length}`);

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10); // low cost = test only

  const orgs = [
    { code: "E2E_ALPHA", name: "E2E Alpha Academy", tag: "a" },
    { code: "E2E_BRAVO", name: "E2E Bravo Institute", tag: "b" },
  ] as const;

  const out: Record<string, Record<string, string>> = {};

  for (const [idx, def] of orgs.entries()) {
    const org = await prisma.organization.create({
      data: {
        name: def.name,
        code: def.code,
        description: "Synthetic tenant created by Phase 32 E2E fixtures.",
        timezone: "Asia/Tehran",
        language: "en",
        status: "ACTIVE",
        settings: { create: { mfaMode: "OPTIONAL" } },
      },
    });

    const roles = new Map<string, string>();
    for (const role of SYSTEM_ROLES.filter((r) => ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "TEACHER", "STUDENT"].includes(r.key))) {
      const saved = await prisma.accessRole.create({
        data: { organizationId: org.id, key: role.key, name: role.name, description: role.description, baseRole: role.baseRole, system: true },
      });
      for (const p of role.permissions) {
        const pid = permId.get(p);
        if (pid) await prisma.rolePermission.create({ data: { roleId: saved.id, permissionId: pid } });
      }
      roles.set(role.key, saved.id);
    }

    const level = await prisma.level.create({
      data: { organizationId: org.id, code: `E2E_${def.tag.toUpperCase()}_A1`, name: `E2E ${def.tag} A1`, order: 900 + idx, status: "ACTIVE" },
    });
    const group = await prisma.learningGroup.create({
      data: { name: `E2E ${def.tag} Group`, type: "CLASS", organizationId: org.id, status: "ACTIVE", code: `E2E_${def.tag}_G1` },
    });

    const mkUser = async (suffix: string, role: string) =>
      prisma.user.create({
        data: {
          employeeCode: `E2E_${def.tag}_${suffix}`,
          firstName: `E2E${def.tag.toUpperCase()}`,
          lastName: suffix,
          username: `e2e.${suffix}.${def.tag}`,
          email: `e2e.${suffix}.${def.tag}@example.invalid`,
          passwordHash,
          role,
          status: "ACTIVE",
          organizationId: org.id,
        },
      });

    const admin = await mkUser("admin", "ADMIN");
    const superAdmin = await mkUser("super", "ADMIN");
    const teacher = await mkUser("teacher", "TEACHER");
    const student = await mkUser("student", "STUDENT");
    const student2 = await mkUser("student2", "STUDENT");

    await prisma.userOrganization.createMany({
      data: [admin, superAdmin, teacher, student, student2].map((u) => ({ userId: u.id, organizationId: org.id, isPrimary: true })),
    });
    await prisma.learningGroup.update({ where: { id: group.id }, data: { teacherId: teacher.id } });
    // englishLevel must equal the tenant's level code so the level-access
    // resolver can build a context (Level.code is globally unique, so each
    // tenant's codes are prefixed — see PHASE_32_FINAL_REPORT schema gaps).
    await prisma.user.update({ where: { id: student.id }, data: { groupId: group.id, englishLevel: `E2E_${def.tag.toUpperCase()}_A1` } });
    await prisma.user.update({ where: { id: student2.id }, data: { groupId: group.id, englishLevel: `E2E_${def.tag.toUpperCase()}_A1` } });
    await prisma.levelAccessPolicy.create({
      data: { organizationId: org.id, levelCode: `E2E_${def.tag.toUpperCase()}_A1`, active: true, requireExplicitAssignment: false },
    });
    await prisma.userGroupMembership.createMany({
      data: [student, student2].map((u) => ({ userId: u.id, groupId: group.id })),
    });
    await prisma.teacherGroupAssignment.create({
      data: { teacherId: teacher.id, groupId: group.id, assignedById: admin.id },
    });

    // Grants: admin -> ORGANIZATION scope, teacher -> GROUP scope, student -> STUDENT scope
    await prisma.userAccessRole.create({
      data: { userId: admin.id, roleId: roles.get("ORGANIZATION_ADMIN")!, scopeType: "ORGANIZATION", scopeId: org.id, source: "ASSIGNED" },
    });
    await prisma.userAccessRole.create({
      data: { userId: superAdmin.id, roleId: roles.get("SUPER_ADMIN")!, scopeType: "ORGANIZATION", scopeId: org.id, source: "ASSIGNED" },
    });
    await prisma.userAccessRole.create({
      data: { userId: teacher.id, roleId: roles.get("TEACHER")!, scopeType: "GROUP", scopeId: group.id, source: "ASSIGNED" },
    });
    for (const st of [student, student2]) {
      await prisma.userAccessRole.create({
        data: { userId: st.id, roleId: roles.get("STUDENT")!, scopeType: "STUDENT", scopeId: st.id, source: "ASSIGNED" },
      });
    }

    // Course -> module -> lesson, assigned to the group
    const course = await prisma.course.create({
      data: { code: `E2E_${def.tag}_COURSE`, title: `E2E ${def.tag} Course`, levelId: level.id, status: "PUBLISHED" },
    });
    const mod = await prisma.module.create({ data: { courseId: course.id, title: `E2E ${def.tag} Module`, order: 1, status: "PUBLISHED" } });
    const lesson = await prisma.lesson.create({
      data: { moduleId: mod.id, title: `E2E ${def.tag} Lesson`, order: 1, status: "PUBLISHED", description: "Synthetic lesson body for Phase 32 E2E." },
    });
    await prisma.courseAssignment.create({ data: { courseId: course.id, groupId: group.id } });

    // Assessment (exam) scoped through the course
    const assessment = await prisma.assessment.create({
      data: { title: `E2E ${def.tag} Exam`, type: "QUIZ", courseId: course.id, createdById: teacher.id, status: "PUBLISHED" },
    });

    // Homework
    const homework = await prisma.assignment.create({
      data: {
        title: `E2E ${def.tag} Homework`,
        type: "WRITING",
        groupId: group.id,
        teacherId: teacher.id,
        dueAt: new Date(Date.now() + 7 * 864e5),
        status: "PUBLISHED",
        lessonId: lesson.id,
      },
    });

    // Attendance
    const session = await prisma.classSession.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
        title: `E2E ${def.tag} Session`,
        scheduledStart: new Date(Date.now() - 864e5),
        scheduledEnd: new Date(Date.now() - 864e5 + 3600e3),
        status: "COMPLETED",
        lessonId: lesson.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: { sessionId: session.id, studentId: student.id, status: "PRESENT", markedById: teacher.id },
    });

    // Private media owned by this tenant
    const mediaKey = `content/e2e/${def.tag}-private.pdf`;
    const mediaBytes = Buffer.from(`%PDF-1.4\n% E2E ${def.tag} private media\n`);
    const mediaPath = path.join(STORAGE_ROOT, mediaKey);
    mkdirSync(path.dirname(mediaPath), { recursive: true });
    writeFileSync(mediaPath, mediaBytes);
    const { createHash } = await import("crypto");
    const media = await prisma.contentMedia.create({
      data: {
        kind: "DOCUMENT",
        fileName: `${def.tag}-private.pdf`,
        originalName: `${def.tag}-private.pdf`,
        mimeType: "application/pdf",
        sizeBytes: mediaBytes.length,
        storagePath: mediaKey,
        storageProvider: "local",
        accessLevel: "RESTRICTED",
        processingStatus: "READY",
        checksum: createHash("sha256").update(mediaBytes).digest("hex"),
        version: 1,
        uploadedById: teacher.id,
        organizationId: org.id,
      },
    });

    // Private conversation between this tenant's teacher and student
    const conv = await prisma.conversation.create({ data: { kind: "DIRECT", createdById: teacher.id } });
    await prisma.conversationParticipant.createMany({
      data: [teacher.id, student.id].map((userId) => ({ conversationId: conv.id, userId })),
    });
    const msg = await prisma.message.create({ data: { conversationId: conv.id, senderId: teacher.id, body: "Synthetic private message." } });

    const attachKey = `message_attachment/e2e/${def.tag}-note.pdf`;
    const attachBytes = Buffer.from(`%PDF-1.4\n% E2E ${def.tag} attachment\n`);
    const attachPath = path.join(STORAGE_ROOT, attachKey);
    mkdirSync(path.dirname(attachPath), { recursive: true });
    writeFileSync(attachPath, attachBytes);
    const attachment = await prisma.messageAttachment.create({
      data: {
        messageId: msg.id,
        fileName: `${def.tag}-note.pdf`,
        originalName: `${def.tag}-note.pdf`,
        mimeType: "application/pdf",
        sizeBytes: attachBytes.length,
        storagePath: attachKey,
        storageProvider: "local",
        accessLevel: "PRIVATE",
        processingStatus: "READY",
        checksum: createHash("sha256").update(attachBytes).digest("hex"),
        version: 1,
      },
    });

    out[def.tag] = {
      orgId: org.id, groupId: group.id, courseId: course.id, lessonId: lesson.id,
      assessmentId: assessment.id, homeworkId: homework.id, sessionId: session.id,
      mediaId: media.id, attachmentId: attachment.id, conversationId: conv.id,
      adminId: admin.id, superAdminId: superAdmin.id, teacherId: teacher.id, studentId: student.id, student2Id: student2.id,
      adminUser: admin.username, superUser: superAdmin.username, teacherUser: teacher.username, studentUser: student.username, student2User: student2.username,
      levelId: level.id,
    };
  }

  await prisma.$disconnect();

  const idsFile = path.join(E2E_DIR, "fixtures.json");
  writeFileSync(idsFile, JSON.stringify(out, null, 2));
  log(`fixtures written -> ${path.relative(ROOT, idsFile)}`);
  log("=== E2E fixture summary ===");
  for (const [tag, v] of Object.entries(out)) {
    log(`  org ${tag}: admin=${v.adminUser} teacher=${v.teacherUser} student=${v.studentUser} group=${v.groupId}`);
  }
  log(`STORAGE_ROOT=${path.relative(ROOT, STORAGE_ROOT)}`);
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
