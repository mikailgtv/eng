import { prisma } from "@/lib/prisma";
import { recordDiagnostic } from "./diagnostic";
import { recordPlacement } from "./placement";
import { enqueueManualReviews } from "./review";

/** Side effects after a stored grade. A failure here must not change the stored score. */
export async function afterAssessmentSubmit(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: { select: { type: true } } },
  });
  if (!attempt || attempt.status === "IN_PROGRESS") return;
  await enqueueManualReviews(attemptId).catch(() => undefined);
  if (attempt.assessment.type === "DIAGNOSTIC") await recordDiagnostic(attemptId).catch(() => undefined);
  if (attempt.assessment.type === "PLACEMENT") await recordPlacement(attemptId).catch(() => undefined);
}
