import { recommendForStudent } from "@/lib/content/library";

export async function ContentRecommendations({ studentId }: { studentId: string }) {
  const items = await recommendForStudent(studentId);
  if (items.length === 0) return null;
  return (
    <section className="mb-4 rounded-2xl border border-border p-3 text-sm">
      <h2 className="font-semibold">Recommended practice</h2>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.label}`}>
            <p className="font-medium">{item.label}</p>
            <p className="text-muted">{item.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
