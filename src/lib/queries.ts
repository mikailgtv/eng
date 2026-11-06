/**
 * Centralized database queries. Pages and route handlers call these functions
 * instead of talking to Prisma directly, so authorization-aware data access
 * lives in one place with no duplicated business logic.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUDIT_PAGE_SIZE, USERS_PAGE_SIZE } from "@/lib/constants";
import type { AuditEntry, GroupWithMeta, Paginated, SafeUser } from "@/types";
import { toSafeUser } from "@/lib/serializers";

const USER_SAFE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  employeeCode: true,
  role: true,
  status: true,
  englishLevel: true,
  groupId: true,
  group: { select: { id: true, name: true, type: true, status: true } },
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

type SafeUserRow = Prisma.UserGetPayload<{ select: typeof USER_SAFE_SELECT }>;

function toSafe(row: SafeUserRow): SafeUser {
  return toSafeUser(row as never) as SafeUser;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserFilters = {
  q?: string;
  role?: string;
  groupId?: string;
  status?: string;
  page?: number;
};

export async function listUsers(filters: UserFilters): Promise<Paginated<SafeUser>> {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.UserWhereInput = {
    AND: [
      filters.role ? { role: filters.role } : {},
      filters.status ? { status: filters.status } : {},
      filters.groupId ? { groupId: filters.groupId } : {},
      filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q } },
              { lastName: { contains: filters.q } },
              { username: { contains: filters.q } },
              { email: { contains: filters.q } },
              { employeeCode: { contains: filters.q } },
            ],
          }
        : {},
    ],
  };

  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: USER_SAFE_SELECT,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map(toSafe),
    total,
    page,
    pageSize: USERS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)),
  };
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const row = await prisma.user.findUnique({ where: { id }, select: USER_SAFE_SELECT });
  return row ? toSafe(row) : null;
}

/** Students assigned to any of the given groups. */
export async function listStudentsInGroups(
  groupIds: string[],
  filters: { q?: string; groupId?: string }
): Promise<SafeUser[]> {
  if (groupIds.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      groupId: { in: filters.groupId ? [filters.groupId] : groupIds },
      ...(filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q } },
              { lastName: { contains: filters.q } },
              { employeeCode: { contains: filters.q } },
              { username: { contains: filters.q } },
            ],
          }
        : {}),
    },
    select: USER_SAFE_SELECT,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map(toSafe);
}

/**
 * Authorization-aware student profile lookup.
 * - ADMIN: any user
 * - TEACHER: students in groups they are assigned to lead
 * - any authenticated user: themselves
 */
export async function getStudentProfileForViewer(
  viewer: { id: string; role: string },
  studentId: string
): Promise<SafeUser | null> {
  if (viewer.id === studentId) return getUserById(studentId);
  if (viewer.role === "ADMIN") return getUserById(studentId);
  if (viewer.role === "TEACHER") {
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "STUDENT",
        group: { OR: [{ teacherId: viewer.id }, { teacherLinks: { some: { teacherId: viewer.id } } }] },
      },
      select: USER_SAFE_SELECT,
    });
    return student ? toSafe(student) : null;
  }
  return null;
}

/** Students for the "assign member" picker (search by name / code). */
export async function searchStudents(q: string, limit = 8): Promise<SafeUser[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { employeeCode: { contains: q } },
              { username: { contains: q } },
            ],
          }
        : {}),
    },
    select: USER_SAFE_SELECT,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: limit,
  });
  return rows.map(toSafe);
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

const GROUP_WITH_META = {
  id: true,
  name: true,
  type: true,
  description: true,
  status: true,
  createdAt: true,
  teacher: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { members: true } },
  assignments: {
    where: { course: { status: "PUBLISHED" } },
    select: { course: { select: { id: true, title: true } } },
  },
} satisfies Prisma.LearningGroupSelect;

type GroupRow = Prisma.LearningGroupGetPayload<{ select: typeof GROUP_WITH_META }>;

function toGroupWithMeta(row: GroupRow): GroupWithMeta {
  return { ...row, courses: row.assignments.map((a) => a.course) };
}

export async function listGroups(filters: { q?: string; status?: string } = {}): Promise<GroupWithMeta[]> {
  const rows = await prisma.learningGroup.findMany({
    where: {
      AND: [
        filters.status ? { status: filters.status } : {},
        filters.q ? { name: { contains: filters.q } } : {},
      ],
    },
    select: GROUP_WITH_META,
    orderBy: { name: "asc" },
  });
  return rows.map(toGroupWithMeta);
}

export async function listGroupsForTeacher(teacherId: string): Promise<GroupWithMeta[]> {
  const rows = await prisma.learningGroup.findMany({
    where: { OR: [{ teacherId }, { teacherLinks: { some: { teacherId } } }] },
    select: GROUP_WITH_META,
    orderBy: { name: "asc" },
  });
  return rows.map(toGroupWithMeta);
}

export async function getGroupById(id: string): Promise<GroupWithMeta | null> {
  const row = await prisma.learningGroup.findUnique({ where: { id }, select: GROUP_WITH_META });
  return row ? toGroupWithMeta(row) : null;
}

export async function listActiveTeachers() {
  return prisma.user.findMany({
    where: { role: "TEACHER", status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/** Group ids a teacher leads (used for authorization-aware teacher views). */
export async function teacherGroupIds(teacherId: string): Promise<string[]> {
  const groups = await prisma.learningGroup.findMany({
    where: { OR: [{ teacherId }, { teacherLinks: { some: { teacherId } } }] },
    select: { id: true },
  });
  return groups.map((g) => g.id);
}

// ---------------------------------------------------------------------------
// Dashboard statistics (real database values)
// ---------------------------------------------------------------------------

export async function getAdminStats() {
  const [totalStudents, totalTeachers, activeGroups, totalUsers, inactiveUsers] = await prisma.$transaction([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.learningGroup.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: "INACTIVE" } }),
  ]);
  return { totalStudents, totalTeachers, activeGroups, totalUsers, inactiveUsers };
}

export async function getTeacherStats(teacherId: string) {
  const [assignedGroups, students] = await prisma.$transaction([
    prisma.learningGroup.count({ where: { teacherId } }),
    prisma.user.count({ where: { role: "STUDENT", group: { teacherId } } }),
  ]);
  return { assignedGroups, students };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function listAuditEntries(page = 1): Promise<Paginated<AuditEntry>> {
  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      include: { actor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);
  return {
    items: rows,
    total,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}

export async function recentAuditEntries(limit = 5): Promise<AuditEntry[]> {
  return prisma.auditLog.findMany({
    include: { actor: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
