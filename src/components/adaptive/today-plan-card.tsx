import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";

export function TodayPlanCard({
  minutes,
  items,
  note,
}: {
  minutes: number;
  items: { title: string; reason: string; href: string; durationMin: number }[];
  note: string | null;
}) {
  return (
    <Card className="mb-6 border-primary/25">
      <CardBody>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your learning plan</p>
        <h2 className="mt-1 text-lg font-semibold">Today&apos;s goal: {minutes} minutes</h2>
        <p className="mt-1 text-sm text-muted">Recommended from your own records. Not a grade, and not compared with other students.</p>
        {note && <p className="mt-2 text-sm">{note}</p>}
        <ol className="mt-3 space-y-2">
          {items.slice(0, 4).map((item, index) => (
            <li key={`${item.title}-${index}`} className="text-sm">
              <Link href={item.href} className="font-medium underline">{index + 1}. {item.title}</Link>
              <span className="mt-0.5 block text-muted">{item.reason}</span>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted">No practice is recorded yet. Start with your lesson.</li>}
        </ol>
        <Link href="/student/plan" className="mt-3 inline-flex h-11 items-center text-sm font-medium text-primary underline">Open today&apos;s plan</Link>
      </CardBody>
    </Card>
  );
}
