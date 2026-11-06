/**
 * Server-side page guards (complement src/middleware.ts).
 * Middleware performs coarse redirects at the edge; these guards run inside
 * layouts/pages and re-validate the session against the database, so they are
 * the authoritative check. Pages never implement their own auth logic.
 */
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import type { Role } from "@/lib/constants";
import type { SessionUser } from "@/types";

/** Redirect to /login when unauthenticated, /unauthorized on role mismatch. */
export async function requirePageUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/unauthorized");
  return user;
}

/** Redirect an authenticated user to their role home. */
export function redirectRoleHome(user: SessionUser): never {
  redirect(ROLE_HOME[user.role] ?? "/dashboard");
}
