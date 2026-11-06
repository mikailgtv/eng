import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { getUserById } from "@/lib/queries";
import Link from "next/link";
import { StudentProfile } from "@/components/profile/student-profile";

export const metadata: Metadata = { title: "My profile" };

/** A student's own profile. Data is strictly self-scoped by session. */
export default async function StudentProfilePage() {
  const user = await requirePageUser(["STUDENT", "ADMIN"]);
  const student = await getUserById(user.id);
  if (!student) throw new Error("Profile not found for session user " + user.id);
  return (
    <div>
      <p className="mb-3 text-sm"><Link className="underline" href="/student/security">Security and preferences</Link></p>
      <StudentProfile student={student} />
    </div>
  );
}
