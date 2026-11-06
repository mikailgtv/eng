import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";

/** Entry point: send authenticated users to their role home, others to login. */
export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? ROLE_HOME[user.role] ?? "/dashboard" : "/login");
}
