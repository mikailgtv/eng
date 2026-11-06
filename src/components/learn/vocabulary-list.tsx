import { BookMarked } from "lucide-react";
import { VocabularyDeck } from "@/components/learn/vocabulary-deck";
import type { VocabItem } from "@/types/learning";

/**
 * Vocabulary display — word, phonetics, translation and an example sentence.
 * The Listen player renders ONLY when a real audio URL exists: we never show
 * a broken or fake audio control.
 */
export function VocabularyList({ items }: { items: VocabItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="vocab-heading" className="mt-8">
      <h2 id="vocab-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <BookMarked className="h-[18px] w-[18px] text-primary" aria-hidden /> Vocabulary
        <span className="text-sm font-normal text-muted">({items.length} words)</span>
      </h2>
      <VocabularyDeck items={items} />
      <ul className="hidden grid-cols-1 gap-3 sm:grid sm:grid-cols-2">
        {items.map((v) => (
          <li key={v.id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-lg font-semibold tracking-tight text-foreground">{v.word}</p>
              {v.phonetic && <p className="text-sm text-muted">{v.phonetic}</p>}
            </div>
            {v.pronunciation && (
              <p className="mt-0.5 text-xs uppercase tracking-wide text-muted">say: {v.pronunciation}</p>
            )}
            {v.translation && <p dir="auto" className="mt-1 text-[15px] text-foreground">{v.translation}</p>}
            {v.exampleSentence && (
              <p className="mt-2 border-l-2 border-primary-subtle pl-2.5 text-[13px] italic leading-5 text-muted">
                “{v.exampleSentence}”
              </p>
            )}
            {v.audioUrl && (
              <audio controls preload="none" src={v.audioUrl} className="mt-2.5 h-9 w-full">
                Your browser does not support audio playback.
              </audio>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
