import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { UsersPage } from "@/components/admin/users/users-page";

export const metadata: Metadata = { title: "Students" };

/** ADMIN — student accounts only (role-locked user list). */
export default async function AdminStudentsPage({ searchParams: rawSearchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const viewer = await requirePageUser(["ADMIN"]);
  return (
    <UsersPage
      viewer={viewer}
      basePath="/admin/students"
      title="Students"
      description="Student accounts across all learning groups."
      lockedRole="STUDENT"
      searchParams={searchParams}
    />
  );
}
