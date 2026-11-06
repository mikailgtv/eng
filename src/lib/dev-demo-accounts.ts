import "server-only";

/** Non-production sample sign-ins. Import only from a server component. */
export const developmentDemoAccounts = [
  { role: "Admin", identifier: "admin", password: "Admin#Demo1" },
  { role: "Teacher", identifier: "sara.whitfield", password: "Teacher#Demo1" },
  { role: "Student", identifier: "james.carter", password: "Student#Demo1" },
] as const;
