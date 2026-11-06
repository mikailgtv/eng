import { requirePageUser } from "@/lib/guards";

/** TEACHER + ADMIN only. */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(["TEACHER", "ADMIN"]);
  return <>{children}</>;
}
