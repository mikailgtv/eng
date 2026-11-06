import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { SecurityPage } from "@/components/identity/security-page";

export const metadata: Metadata = { title: "Security" };

export default async function TeacherSecurityPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  return <SecurityPage user={user} />;
}
