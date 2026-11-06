/** Permission catalog and system-role defaults. New keys are deny until granted. */

export const PERMISSIONS = [
  ["users.view", "Users", "View accounts in scope"],
  ["users.create", "Users", "Create accounts"],
  ["users.edit", "Users", "Edit accounts"],
  ["users.archive", "Users", "Suspend, deactivate or archive accounts"],
  ["users.import", "Users", "Import accounts"],
  ["users.impersonate", "Users", "View the product as another user"],
  ["groups.view", "Groups", "View groups in scope"],
  ["groups.manage", "Groups", "Create and edit groups"],
  ["departments.manage", "Organization", "Manage departments and teams"],
  ["organizations.manage", "Organization", "Manage organization settings"],
  ["courses.view", "Courses", "View courses in scope"],
  ["courses.create", "Courses", "Create courses"],
  ["courses.edit", "Courses", "Edit courses in scope"],
  ["courses.publish", "Courses", "Publish courses"],
  ["courses.assign", "Courses", "Assign courses"],
  ["content.view", "Content", "View content in scope"],
  ["content.create", "Content", "Create content drafts"],
  ["content.review", "Content", "Review content"],
  ["content.publish", "Content", "Publish content"],
  ["reports.view", "Reports", "View reports in scope"],
  ["reports.export", "Reports", "Export reports"],
  ["certificates.issue", "Certificates", "Issue certificates"],
  ["certificates.revoke", "Certificates", "Revoke certificates"],
  ["messages.send", "Communication", "Send messages"],
  ["announcements.create", "Communication", "Create announcements"],
  ["ai.use", "AI", "Use the learning assistant"],
  ["ai.manage", "AI", "Manage assistant settings"],
  ["settings.manage", "Settings", "Manage organization settings"],
  ["audit.view", "Audit", "View the audit trail"],
  ["security.view", "Security", "View security events"],
  ["security.manage", "Security", "Change security policy"],
  ["sessions.view", "Sessions", "View sessions in scope"],
  ["sessions.revoke", "Sessions", "Revoke sessions in scope"],
  ["roles.manage", "Access", "Manage roles and permissions"],
  ["invitations.manage", "Access", "Invite users"],
  ["delegations.manage", "Access", "Delegate access"],
  ["access.review", "Access", "Review access"],
  ["mfa.manage", "Security", "Manage own sign-in security"],
  ["assessments.manage", "Assessments", "Create blueprints, variants, and assessment settings"],
  ["assessments.review", "Assessments", "Review writing and speaking and finalize official scores"],
  ["assessments.take", "Assessments", "Take an assigned assessment"],
  ["assessments.analytics", "Assessments", "View question and assessment analytics"],
  ["integrations.view", "Integrations", "View configured enterprise integrations and sync status"],
  ["integrations.manage", "Integrations", "Configure enterprise integrations, credentials, and webhooks"],
  ["integrations.sync", "Integrations", "Trigger external sync and data exchange jobs"],
  ["workflows.view", "Automation", "View organization workflows and execution summaries"],
  ["workflows.manage", "Automation", "Create, version, validate and publish workflows"],
  ["workflows.execute", "Automation", "Run authorized workflow simulations and queue processing"],
  ["workflows.approve", "Automation", "Approve or reject workflow approval steps"],
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number][0];

const ALL = PERMISSIONS.map((item) => item[0]);

export const SYSTEM_ROLES: {
  key: string;
  name: string;
  description: string;
  baseRole: "STUDENT" | "TEACHER" | "ADMIN";
  permissions: PermissionKey[];
}[] = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Every permission, including support access. Not assigned automatically.",
    baseRole: "ADMIN",
    permissions: ALL,
  },
  {
    key: "ORGANIZATION_ADMIN",
    name: "Organization Admin",
    description: "Matches the existing administrator, except support access stays off until granted.",
    baseRole: "ADMIN",
    permissions: ALL.filter((key) => key !== "users.impersonate"),
  },
  {
    key: "TRAINING_ADMIN",
    name: "Training Admin",
    description: "Training, content and reports. Cannot manage accounts or security policy.",
    baseRole: "ADMIN",
    permissions: ["users.view", "groups.view", "courses.view", "courses.create", "courses.edit", "courses.publish", "courses.assign", "content.view", "content.create", "content.review", "content.publish", "reports.view", "reports.export", "certificates.issue", "announcements.create", "ai.manage", "messages.send", "assessments.manage", "assessments.review", "assessments.analytics", "workflows.view", "workflows.manage", "workflows.execute", "workflows.approve"],
  },
  {
    key: "REVIEWER",
    name: "Reviewer",
    description: "Can review content. Does not publish or manage accounts.",
    baseRole: "TEACHER",
    permissions: ["content.view", "content.review", "courses.view", "reports.view", "messages.send", "assessments.review", "assessments.analytics"],
  },
  {
    key: "TEACHER",
    name: "Teacher",
    description: "Assigned groups only.",
    baseRole: "TEACHER",
    permissions: ["users.view", "groups.view", "courses.view", "courses.edit", "courses.assign", "content.view", "content.create", "reports.view", "messages.send", "announcements.create", "ai.use", "mfa.manage", "assessments.manage", "assessments.review", "assessments.analytics"],
  },
  {
    key: "ASSISTANT_TEACHER",
    name: "Assistant Teacher",
    description: "Can view an assigned group. Cannot publish or change roles.",
    baseRole: "TEACHER",
    permissions: ["users.view", "groups.view", "courses.view", "content.view", "messages.send", "ai.use", "mfa.manage", "assessments.analytics"],
  },
  {
    key: "STUDENT",
    name: "Student",
    description: "Own learning only.",
    baseRole: "STUDENT",
    permissions: ["courses.view", "content.view", "reports.view", "messages.send", "ai.use", "mfa.manage", "assessments.take"],
  },
  {
    key: "VIEWER",
    name: "Viewer",
    description: "Read-only access to the student shell. No management actions.",
    baseRole: "STUDENT",
    permissions: ["courses.view", "content.view", "reports.view"],
  },
];

export const ACCOUNT_STATUSES = ["INVITED", "PENDING", "ACTIVE", "SUSPENDED", "INACTIVE", "ARCHIVED"] as const;
export type AccountLifecycle = (typeof ACCOUNT_STATUSES)[number];

export function canLoginStatus(status: string) {
  return status === "ACTIVE";
}
