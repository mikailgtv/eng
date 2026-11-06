"use client";

import { useState } from "react";
import type { VocabItem } from "@/types/learning";

export function VocabularyDeck({ items }: { items: VocabItem[] }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const item = items[index];
  if (!item) return null;

  function go(next: number) {
    setIndex(Math.min(items.length - 1, Math.max(0, next)));
  }

  return (
    <div className="sm:hidden">
      <article
        className="rounded-xl border border-border bg-surface p-4 shadow-card"
        onPointerDown={(event) => setStartX(event.clientX)}
        onPointerUp={(event) => {
          if (startX === null) return;
          const delta = event.clientX - startX;
          if (delta < -40) go(index + 1);
          if (delta > 40) go(index - 1);
          setStartX(null);
        }}
      >
        <p className="text-xs text-muted">Word {index + 1} of {items.length}</p>
        <h3 className="mt-1 text-2xl font-semibold">{item.word}</h3>
        {item.phonetic && <p className="text-sm text-muted">{item.phonetic}</p>}
        {item.translation && <p dir="auto" className="mt-2 text-base">{item.translation}</p>}
        {item.exampleSentence && <p className="mt-2 text-sm text-muted">“{item.exampleSentence}”</p>}
        {item.audioUrl ? (
          <audio controls preload="none" src={item.audioUrl} className="mt-3 w-full">Audio is unavailable. The word is shown above.</audio>
        ) : (
          <p className="mt-3 text-sm text-muted">Listen is unavailable. The word is shown as text.</p>
        )}
      </article>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-11 rounded-lg border border-border text-sm font-medium" onClick={() => go(index - 1)} disabled={index === 0}>Previous word</button>
        <button type="button" className="min-h-11 rounded-lg border border-border text-sm font-medium" onClick={() => go(index + 1)} disabled={index === items.length - 1}>Next word</button>
      </div>
      <p className="mt-2 text-xs text-muted">Swipe left or right, or use the buttons. Saving a word happens in Review.</p>
    </div>
  );
}
