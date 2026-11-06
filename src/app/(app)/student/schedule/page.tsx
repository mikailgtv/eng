import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { ComingSoon } from "@/components/profile/coming-soon";

export const metadata: Metadata = { title: "Schedule" };

export default async function StudentSchedulePage() {
  await requirePageUser(["STUDENT", "ADMIN"]);
  return (
    <ComingSoon
      title="Schedule"
      planned="Your class timetable will appear here once scheduling is introduced — dates, times and join links for your group."
      phase="a future phase"
      backHref="/student"
    />
  );
}
