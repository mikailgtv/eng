import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { UsersPage } from "@/components/admin/users/users-page";

export const metadata: Metadata = { title: "Teachers" };

/** ADMIN — teacher accounts only (role-locked user list). */
export default async function AdminTeachersPage({ searchParams: rawSearchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const viewer = await requirePageUser(["ADMIN"]);
  return (
    <UsersPage
      viewer={viewer}
      basePath="/admin/teachers"
      title="Teachers"
      description="Teacher accounts. Assign teachers as lead of a learning group from the group's page."
      lockedRole="TEACHER"
      searchParams={searchParams}
    />
  );
}
