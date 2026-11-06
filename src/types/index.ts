import type { AccountStatus, Role } from "@/lib/constants";

/** Minimal group info embedded in a session / profile. */
export type SafeGroup = {
  id: string;
  name: string;
  type: string;
  status: string;
};

/** The authenticated user as stored in the request-scoped session.
 *  Never contains credentials; attributes are refreshed from the DB. */
export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string | null;
  employeeCode: string;
  role: Role;
  status: AccountStatus;
  englishLevel: string | null;
  groupId: string | null;
  group: SafeGroup | null;
  /**
   * Tenant boundary of the signed-in account, resolved from the database on
   * every request. Server-side tenant checks compare this to the target
   * record's organization — never to a client-supplied value.
   */
  organizationId: string | null;
  /** Set only while an authorized administrator is viewing as this user. */
  impersonatorId?: string | null;
};

/** A user row safe to send to the client (passwordHash stripped). */
export type SafeUser = Omit<import("@prisma/client").User, "passwordHash"> & {
  group: SafeGroup | null;
};

export type GroupWithMeta = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  createdAt: Date;
  teacher: { id: string; firstName: string; lastName: string } | null;
  _count: { members: number };
  /** Published courses assigned to this group (Phase 2). */
  courses: { id: string; title: string }[];
};

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: Date;
  actor: { id: string; firstName: string; lastName: string } | null;
};

export type GroupOption = {
  id: string;
  name: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
