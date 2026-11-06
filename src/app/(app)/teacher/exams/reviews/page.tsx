import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { listReviewQueue } from "@/lib/assessment/intelligence/review";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AssessmentReviewsPage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const items = await listReviewQueue({ id: user.id, role: user.role });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link href="/teacher/exams" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assessments
      </Link>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Assessment Review Center</h1>
        <p className="text-sm text-muted">Pending writing &amp; speaking submissions awaiting teacher rubric evaluation.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-sm">Pending submissions ({items.length})</CardTitle></CardHeader>
        <CardBody className="p-0">
          {items.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up!"
              description="No manual writing or speaking assessments are awaiting review in your assigned groups."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border text-xs sm:text-sm">
              {items.map((item) => (
                <li key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.student}</p>
                    <p className="text-muted">{item.assessment} · {item.kind === "WRITING" ? "Writing submission" : "Speaking submission"}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                    <Clock className="h-3 w-3" /> Under review
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <p className="text-xs text-muted">
        Once finalized with a rubric, the score becomes official and changes are restricted to audited score corrections.
      </p>
    </div>
  );
}
