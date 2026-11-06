import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { getAdminStats, listGroups, recentAuditEntries } from "@/lib/queries";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  await requirePageUser(["ADMIN"]);
  const [stats, groups, recentAudit] = await Promise.all([
    getAdminStats(),
    listGroups(),
    recentAuditEntries(5),
  ]);
  return <AdminDashboard stats={stats} groups={groups} recentAudit={recentAudit} />;
}
