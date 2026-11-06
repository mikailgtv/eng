import { AlertTriangle, BookOpen, Lightbulb } from "lucide-react";
import { GrammarPanel } from "@/components/learn/grammar-panel";
import type { GrammarItem, VocabItem } from "@/types/learning";

/**
 * Lesson content-block renderer.
 * Each block type has one small renderer; unknown/invalid blocks never
 * reach here (filtered server-side in lib/learning.ts). QUESTION blocks are
 * rendered separately in the Practice section.
 */

type Block = { type: string; data: unknown };

interface ContentBlocksProps {
  blocks: Block[];
  /** Embedded VOCABULARY blocks may fall back to rendering lesson vocabulary. */
  lessonVocabulary?: VocabItem[];
  embeddedGrammar?: (props: { item: GrammarItem }) => React.ReactNode;
}

export function ContentBlocks({ blocks, lessonVocabulary = [] }: ContentBlocksProps) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} lessonVocabulary={lessonVocabulary} />
      ))}
    </div>
  );
}

function BlockRenderer({ block, lessonVocabulary }: { block: Block; lessonVocabulary: VocabItem[] }) {
  const d = block.data as Record<string, unknown>;

  switch (block.type) {
    case "HEADING": {
      const text = String(d.text);
      return d.level === 3 ? (
        <h3 className="mt-2 text-[15px] font-semibold text-foreground">{text}</h3>
      ) : (
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{text}</h2>
      );
    }

    case "TEXT": {
      const paragraphs = String(d.text).split(/\n\n+/);
      return (
        <>
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-7 text-foreground sm:text-base sm:leading-8">
              {p}
            </p>
          ))}
        </>
      );
    }

    case "EXAMPLE": {
      const items = (d.items as { text: string; note?: string }[]) ?? [];
      return (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
          {typeof d.intro === "string" && (
            <p className="mb-2.5 text-[13px] font-medium text-muted">{d.intro}</p>
          )}
          <ul className="space-y-2" dir="auto">
            {items.map((item, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] leading-7 text-foreground sm:text-base">“{item.text}”</span>
                {item.note && (
                  <span dir="auto" className="text-[13px] text-muted">
                    {item.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "TIP":
      return (
        <aside className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4" role="note">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
          <p className="text-sm leading-6 text-teal-900">
            <span className="font-semibold">Tip: </span>
            {String(d.text)}
          </p>
        </aside>
      );

    case "WARNING":
      return (
        <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4" role="note">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <p className="text-sm leading-6 text-amber-900">
            <span className="font-semibold">Careful: </span>
            {String(d.text)}
          </p>
        </aside>
      );

    case "VOCABULARY": {
      // Embedded variant: renders items provided in the block; a future
      // teacher builder can author inline vocabulary. Without items it shows
      // only its intro line (lesson vocabulary is rendered separately).
      const items = d.items as { word: string; translation?: string; phonetic?: string; example?: string }[] | undefined;
      return (
        <div>
          {typeof d.intro === "string" && <p className="text-[13px] font-medium text-muted">{d.intro}</p>}
          {items && (
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" dir="auto">
              {items.map((v, i) => (
                <li key={i} className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card">
                  <p className="text-[15px] font-semibold text-foreground">
                    {v.word}
                    {v.phonetic && <span className="ml-2 text-xs font-normal text-muted">{v.phonetic}</span>}
                  </p>
                  {v.translation && <p dir="auto" className="text-[13px] text-foreground">{v.translation}</p>}
                  {v.example && <p className="mt-1 text-[13px] italic text-muted">“{v.example}”</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    case "GRAMMAR":
      return (
        <GrammarPanel
          item={{
            id: `block-${d.title as string}`,
            title: String(d.title),
            explanation: (d.explanation as string) ?? null,
            patterns: (d.patterns as string[]) ?? [],
            examples: (d.examples as string[]) ?? [],
          }}
        />
      );

    case "IMAGE":
      return (
        <figure>
          <img
            src={String(d.url)}
            alt={String(d.alt)}
            loading="lazy"
            className="max-h-96 w-full rounded-xl border border-border object-cover shadow-card"
          />
          {typeof d.caption === "string" && (
            <figcaption className="mt-1.5 text-center text-[13px] text-muted">{d.caption}</figcaption>
          )}
        </figure>
      );

    case "AUDIO":
      return (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          {typeof d.title === "string" && (
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <BookOpen className="h-4 w-4 text-muted" aria-hidden /> {d.title}
            </p>
          )}
          {/* Real audio only — this block type is only emitted when a URL exists */}
          <audio controls preload="none" src={String(d.url)} className="w-full">
            Your browser does not support audio playback.
          </audio>
        </div>
      );

    case "VIDEO":
      return (
        <figure>
          <video controls preload="metadata" src={String(d.url)} className="w-full rounded-xl border border-border shadow-card">
            Your browser does not support video playback.
          </video>
          {typeof d.title === "string" && (
            <figcaption className="mt-1.5 text-center text-[13px] text-muted">{d.title}</figcaption>
          )}
        </figure>
      );

    case "TEACHER_NOTE":
      return null;

    case "AI_PRACTICE":
      return (
        <section className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">AI Practice</p>
          <p className="mt-1">{String(d.prompt ?? "")}</p>
          <p className="mt-2 text-xs text-muted">This is practice, not an official grade.</p>
        </section>
      );

    case "LISTENING":
      return (
        <section className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium">{String(d.title ?? "Listening")}</p>
          {typeof d.audioUrl === "string" && d.audioUrl ? (
            <audio controls preload="none" src={d.audioUrl} className="mt-2 w-full">Your browser does not support audio playback.</audio>
          ) : (
            <p className="mt-2 text-muted">Audio is unavailable. {typeof d.transcript === "string" ? d.transcript : "The transcript is not stored."}</p>
          )}
        </section>
      );

    case "DIALOGUE":
      return (
        <ul className="space-y-2 text-sm">
          {Array.isArray(d.lines) && (d.lines as { speaker?: string; text?: string; translation?: string }[]).map((line, index) => (
            <li key={index} className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium">{line.speaker}: {line.text}</p>
              {line.translation && <p className="text-xs text-muted">{line.translation}</p>}
            </li>
          ))}
        </ul>
      );

    default: {
      const title = typeof d.title === "string" ? d.title : block.type.replaceAll("_", " ");
      const text = typeof d.text === "string" ? d.text : typeof d.prompt === "string" ? d.prompt : "";
      const translation = typeof d.translation === "string" ? d.translation : "";
      if (!text && !title) return null;
      return (
        <section className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
          {text && <p className="mt-1 whitespace-pre-wrap">{text}</p>}
          {translation && <p className="mt-1 text-muted">{translation}</p>}
        </section>
      );
    }
  }
}
