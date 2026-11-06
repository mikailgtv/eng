import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
  /** What this section will contain once built. */
  planned: string;
  phase: string;
  backHref: string;
}

/**
 * Honest placeholder for routes that belong to a later phase. The route,
 * navigation entry and layout all exist — only the feature itself is pending.
 * This is intentionally NOT clickable or interactive.
 */
export function ComingSoon({ title, planned, phase, backHref }: ComingSoonProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
      <p className="mb-6 text-sm text-muted">Part of the learning platform, arriving in {phase}.</p>
      <Card>
        <CardBody className="flex flex-col items-center py-12 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle">
            <CalendarClock className="h-6 w-6 text-primary" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">Planned for {phase}</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">{planned}</p>
          <p className="mt-1 max-w-md text-xs text-muted">
            Nothing has been set up in this area yet — this page will light up as soon as the feature ships.
          </p>
          <Link href={backHref} className="mt-6">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
