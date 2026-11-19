import React from 'react';
import { BookOpenText, Copy, Languages, ListChecks } from 'lucide-react';
import { StoryReviewItem, VocabWord } from '../types/vocab';
import { parseStoryWordReview } from '../utils/lessonParser';

interface StorySectionProps {
  story: string;
  banglaSummary: string;
  storyWordReview: StoryReviewItem[];
  storyWordReviewRaw?: string;
  words: VocabWord[];
  onCopy: (text: string, label: string) => void;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const StorySection: React.FC<StorySectionProps> = ({
  story,
  banglaSummary,
  storyWordReview,
  storyWordReviewRaw,
  words,
  onCopy,
}) => {
  const renderHighlightedStory = (text: string) => {
    if (!text.trim()) {
      return <p className="text-sm text-slate-400 italic">No story provided for this lesson.</p>;
    }

    // Build regex for **bold** segments AND target vocabulary words
    const vocabTerms = words
      .map((w) => w.word.trim())
      .filter((w) => w.length >= 2)
      .sort((a, b) => b.length - a.length);

    const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);

    return paragraphs.map((paragraph, pIdx) => {
      // First split by **bold** markdown markers
      const boldSegments = paragraph.split(/(\*\*[^*]+\*\*)/g);

      return (
        <p
          key={pIdx}
          className="text-base sm:text-[17px] leading-[1.75] text-slate-800 dark:text-slate-200"
        >
          {boldSegments.map((seg, sIdx) => {
            if (seg.startsWith('**') && seg.endsWith('**')) {
              const inner = seg.slice(2, -2);
              return (
                <mark
                  key={sIdx}
                  className="bg-blue-100/80 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 font-semibold px-1 py-0.5 rounded"
                >
                  {inner}
                </mark>
              );
            }

            if (vocabTerms.length === 0) return <React.Fragment key={sIdx}>{seg}</React.Fragment>;

            const pattern = new RegExp(
              `\\b(${vocabTerms.map(escapeRegExp).join('|')})(?:s|es|ed|d|ing|ly)?\\b`,
              'gi'
            );
            const parts = seg.split(pattern);

            return (
              <React.Fragment key={sIdx}>
                {parts.map((part, i) => {
                  const isMatch = vocabTerms.some((term) => {
                    const lowerPart = part.toLowerCase();
                    const lowerTerm = term.toLowerCase();
                    return (
                      lowerPart === lowerTerm ||
                      lowerPart.startsWith(lowerTerm) &&
                        ['s', 'es', 'ed', 'd', 'ing', 'ly'].includes(
                          lowerPart.slice(lowerTerm.length)
                        )
                    );
                  });

                  if (isMatch) {
                    return (
                      <mark
                        key={i}
                        className="bg-blue-100/80 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 font-semibold px-1 py-0.5 rounded"
                      >
                        {part}
                      </mark>
                    );
                  }
                  return <React.Fragment key={i}>{part}</React.Fragment>;
                })}
              </React.Fragment>
            );
          })}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* English Story */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 print-break-avoid">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <BookOpenText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
              Story
            </h2>
          </div>
          {story && (
            <button
              type="button"
              onClick={() => onCopy(story.replace(/\*\*/g, ''), 'Story')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 no-print"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          )}
        </div>
        <div className="mt-4 space-y-4">{renderHighlightedStory(story)}</div>
      </section>

      {/* Bangla Story Summary */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 print-break-avoid">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Languages className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
              বাংলা সারাংশ
            </h2>
          </div>
          {banglaSummary && (
            <button
              type="button"
              onClick={() => onCopy(banglaSummary, 'Bangla Summary')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 no-print"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          )}
        </div>
        <div className="mt-4">
          {banglaSummary ? (
            <p className="text-base sm:text-[17px] leading-[1.8] text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {banglaSummary}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">No Bangla summary provided for this lesson.</p>
          )}
        </div>
      </section>

      {/* Story Word Review */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 print-break-avoid">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            Story Word Review
          </h2>
        </div>

        <div className="mt-4">
          {(() => {
            const reviewItems =
              storyWordReviewRaw && storyWordReviewRaw.trim()
                ? parseStoryWordReview(storyWordReviewRaw)
                : storyWordReview;

            if (reviewItems.length > 0) {
              return (
                <ul className="list-disc pl-5 space-y-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                  {reviewItems.map((item, idx) => (
                    <li key={item.id || idx} className="pl-1">
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.word}
                      </strong>
                      {item.meaning && (
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}
                          ({item.meaning})
                        </span>
                      )}
                      {item.phrase ? (
                        <>
                          {' '}
                          <span aria-hidden="true">→</span>{' '}
                          <em className="italic text-slate-800 dark:text-slate-200">
                            {item.phrase}
                            {item.usage ? ':' : ''}
                          </em>
                          {item.usage ? <span> {item.usage}</span> : null}
                        </>
                      ) : item.usage ? (
                        <span>: {item.usage}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              );
            }

            return (
              <p className="text-sm text-slate-400 italic">
                No Story Word Review provided for this lesson.
              </p>
            );
          })()}
        </div>
      </section>
    </div>
  );
};
