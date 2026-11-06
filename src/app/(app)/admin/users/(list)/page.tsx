import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { UsersPage } from "@/components/admin/users/users-page";

export const metadata: Metadata = { title: "Users" };

/** ADMIN user management — all roles, full search & filters. */
export default async function AdminUsersPage({ searchParams: rawSearchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const viewer = await requirePageUser(["ADMIN"]);
  return (
    <UsersPage
      viewer={viewer}
      basePath="/admin/users"
      title="Users"
      description="All platform accounts — students, teachers and administrators."
      searchParams={searchParams}
    />
  );
}
