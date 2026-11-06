import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/guards";

export default async function NotificationEntryPage() {
  const user = await requirePageUser();
  if (user.role === "ADMIN") redirect("/admin/notifications");
  if (user.role === "TEACHER") redirect("/teacher/notifications");
  redirect("/student/notifications");
}
