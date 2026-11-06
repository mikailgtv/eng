/**
 * Zod schemas shared by client forms and API route handlers — one definition,
 * enforced on both sides. Error messages are written to be shown to users.
 */
import { z } from "zod";
import { ENGLISH_LEVELS, GROUP_TYPES, ROLES, STATUSES } from "@/lib/constants";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(40, "Username must be at most 40 characters.")
  .regex(/^[a-z0-9._-]+$/, "Username may only contain letters, numbers, dots, dashes and underscores.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(120, "Email is too long.")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const passwordChangeSchema = passwordSchema;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email.").max(120),
  password: z.string().min(1, "Enter your password.").max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60, "First name is too long."),
  lastName: z.string().trim().min(1, "Last name is required.").max(60, "Last name is too long."),
  employeeCode: z.string().trim().min(2, "Employee code is required.").max(30, "Employee code is too long."),
  username: usernameSchema,
  email: emailSchema,
  role: z.enum(ROLES, { errorMap: () => ({ message: "Choose a valid role." }) }),
  status: z.enum(STATUSES).default("ACTIVE"),
  groupId: z.string().trim().max(64).optional().or(z.literal("")).transform((v) => v || undefined),
  englishLevel: z
    .enum(ENGLISH_LEVELS.map((l) => l.value) as [string, ...string[]], {
      errorMap: () => ({ message: "Choose a valid level." }),
    })
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  password: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(60).optional(),
    lastName: z.string().trim().min(1, "Last name is required.").max(60).optional(),
    employeeCode: z.string().trim().min(2).max(30).optional(),
    username: usernameSchema.optional(),
    email: emailSchema,
    role: z.enum(ROLES).optional(),
    status: z.enum(STATUSES).optional(),
    groupId: z.string().trim().max(64).optional(), // "" clears the assignment
    englishLevel: z
      .enum(ENGLISH_LEVELS.map((l) => l.value) as [string, ...string[]])
      .nullable()
      .optional(),
    password: passwordSchema.optional().or(z.literal("")).transform((v) => v || undefined),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Nothing to update.",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Group name must be at least 2 characters.").max(80, "Group name is too long."),
  type: z
    .string()
    .trim()
    .min(1, "Choose a group type.")
    .refine((v) => GROUP_TYPES.some((t) => t.value === v), "Choose a valid group type."),
  description: z.string().trim().max(300, "Description is too long (300 characters max).").optional().or(z.literal("")).transform((v) => v || undefined),
  teacherId: z.string().trim().max(64).optional().or(z.literal("")).transform((v) => v || undefined),
  status: z.enum(STATUSES).default("ACTIVE"),
});

export type GroupInput = z.infer<typeof groupSchema>;

export const updateGroupSchema = groupSchema.partial();

export const assignMemberSchema = z.object({
  userId: z.string().trim().min(1, "Choose a student."),
});

export const removeMemberSchema = z.object({
  userId: z.string().trim().min(1, "Choose a member."),
});

/** Lesson completion: the client may report best-effort visible time. */
export const lessonCompleteSchema = z
  .object({
    timeSpentSec: z.number().int().min(0).max(2 * 60 * 60).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Query-string schemas for list pages / API filters
// ---------------------------------------------------------------------------

const optionalString = z.string().trim().max(80).optional().or(z.literal(""));

export const userListQuerySchema = z.object({
  q: optionalString,
  role: z.enum(ROLES).optional().or(z.literal("")).transform((v) => v || undefined),
  groupId: optionalString.transform((v) => v || undefined),
  status: z.enum(STATUSES).optional().or(z.literal("")).transform((v) => v || undefined),
  page: z.coerce.number().int().min(1).default(1),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const groupListQuerySchema = z.object({
  q: optionalString,
  status: z.enum(STATUSES).optional().or(z.literal("")).transform((v) => v || undefined),
});

export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
