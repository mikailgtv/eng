import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { getUserById } from "@/lib/queries";
import { StudentProfile } from "@/components/profile/student-profile";
import { UserFacts } from "@/components/identity/user-facts";

export const metadata: Metadata = { title: "User profile" };

/** ADMIN — view any user's profile (read-only; edits happen in the users list). */
export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requirePageUser(["ADMIN"]);
  const student = await getUserById(id);

  // A missing record is a real 404. Authorization already ran above
  // (requirePageUser), so auth failures can never be reported as "not found".
  if (!student) notFound();

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to users
      </Link>
      <UserFacts actor={viewer} userId={student.id} />
      <StudentProfile student={student} viewerNote="Viewed as administrator" />
    </div>
  );
}
