import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { teacherHome } from "@/lib/teaching/queries";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";

export const metadata: Metadata = { title: "Teacher dashboard" };

export default async function TeacherDashboardPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const home = await teacherHome({ id: user.id, role: user.role, groupId: user.groupId });
  return <TeacherDashboard user={user} home={home} />;
}
