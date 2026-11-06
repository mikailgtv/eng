import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { workflowScope } from "@/lib/workflows/access";
import { AutomationCenter } from "@/components/workflows/automation-center";

export const metadata = { title: "Automation center" };

export default async function AutomationPage() {
  await requirePageUser(["ADMIN"]);
  const access = await workflowScope("workflows.view");
  if (!access.allowed) redirect("/unauthorized");
  return <AutomationCenter />;
}
