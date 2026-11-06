import { Puzzle } from "lucide-react";
import type { GrammarItem } from "@/types/learning";

/**
 * Grammar panel — a simple visual structure: title, short explanation,
 * pattern lines and example sentences. Not a grammar engine, just clear
 * beginner-friendly content.
 */
export function GrammarPanel({ item }: { item: GrammarItem }) {
  return (
    <section aria-label={`Grammar: ${item.title}`} className="mt-8">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/5 px-4 py-3">
          <Puzzle className="h-[18px] w-[18px] text-primary" aria-hidden />
          <h2 className="text-[15px] font-semibold text-foreground">{item.title}</h2>
        </div>
        <div className="px-4 py-4">
          {item.explanation && <p className="text-sm leading-6 text-muted">{item.explanation}</p>}

          {item.patterns.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2" dir="auto">
              {item.patterns.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-primary-subtle/60 px-3 py-2 text-[15px] font-medium text-foreground"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}

          {item.examples.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Examples</p>
              <ul className="mt-1.5 space-y-1">
                {item.examples.map((e, i) => (
                  <li key={i} className="text-[15px] leading-6 text-foreground">
                    “{e}”
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
