import { requirePageUser } from "@/lib/guards";

/** ADMIN only — the most restricted workspace. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(["ADMIN"]);
  return <>{children}</>;
}
