import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import { redirect } from "next/navigation";

/** /dashboard — role-neutral entry that routes each role to its own home. */
export default async function DashboardRedirectPage() {
  const user = await getSessionUser();
  redirect(user ? ROLE_HOME[user.role] ?? "/login" : "/login");
}
