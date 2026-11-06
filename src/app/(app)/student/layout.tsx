import { requirePageUser } from "@/lib/guards";

/** STUDENT + ADMIN only — enforced here (authoritative) and in middleware. */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(["STUDENT", "ADMIN"]);
  return <>{children}</>;
}
