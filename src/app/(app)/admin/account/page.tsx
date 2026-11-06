import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { SecurityPage } from "@/components/identity/security-page";

export const metadata: Metadata = { title: "My security" };

export default async function AdminAccountPage() {
  const user = await requirePageUser(["ADMIN"]);
  return <SecurityPage user={user} />;
}
