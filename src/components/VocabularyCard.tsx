import React from 'react';
import { ChevronDown, ChevronUp, Copy, Star } from 'lucide-react';
import { VocabWord } from '../types/vocab';

interface VocabularyCardProps {
  word: VocabWord;
  displayIndex: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleFavorite: () => void;
  onCopy: (text: string, label: string) => void;
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  displayIndex,
  expanded,
  onToggleExpand,
  onToggleFavorite,
  onCopy,
}) => {
  const statusLabel =
    word.revisionStatus === 'known'
      ? 'Known'
      : word.revisionStatus === 'difficult'
        ? 'Difficult'
        : null;

  const copyPayload = `${word.word}${word.banglaMeaning ? ` — ${word.banglaMeaning}` : ''}${
    word.exampleSentence ? `\nExample: ${word.exampleSentence}` : ''
  }`;

  return (
    <article className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors print-break-avoid">
      {/* Header Row */}
      <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-4">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex-1 text-left flex items-start sm:items-center gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
        >
          <span className="font-mono-num text-xs font-medium text-slate-400 dark:text-slate-500 pt-1 sm:pt-0 shrink-0 w-7">
            {String(word.sourceNumber ?? displayIndex).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h3 className="font-display font-semibold text-lg sm:text-xl text-slate-900 dark:text-slate-100 break-words">
                {word.word}
              </h3>
              {/* Zero-pill unboxed metadata */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {word.partOfSpeech && <span>{word.partOfSpeech}</span>}
                {word.partOfSpeech && word.cefrLevel && <span aria-hidden="true">·</span>}
                {word.cefrLevel && <span className="font-mono-num">{word.cefrLevel}</span>}
                {statusLabel && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        word.revisionStatus === 'known'
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-amber-600 dark:text-amber-400 font-medium'
                      }
                    >
                      {statusLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
            {!expanded && word.banglaMeaning && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 truncate">
                {word.banglaMeaning}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0 no-print">
          <button
            type="button"
            onClick={() => onCopy(copyPayload, `"${word.word}"`)}
            aria-label={`Copy ${word.word}`}
            title="Copy word and example"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={word.isFavorite ? `Remove ${word.word} from favorites` : `Favorite ${word.word}`}
            title={word.isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              word.isFavorite
                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${word.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? `Collapse ${word.word}` : `Expand ${word.word}`}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {/* Bangla Meaning */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Meaning
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              {word.banglaMeaning || '—'}
            </p>
          </div>

          {/* Example + Bangla Translation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Example
                </span>
                {word.exampleSentence && (
                  <button
                    type="button"
                    onClick={() => onCopy(word.exampleSentence, 'Example sentence')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline no-print"
                  >
                    Copy
                  </button>
                )}
              </div>
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                {word.exampleSentence || '—'}
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                বাংলা অনুবাদ
              </div>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {word.banglaTranslation || '—'}
              </p>
            </div>
          </div>

          {/* Synonyms & Antonyms */}
          {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Synonyms
                </div>
                {word.synonyms.length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-800 dark:text-slate-200">
                    {word.synonyms.map((syn, idx) => (
                      <span key={`${syn.term}_${idx}`}>
                        <span className="font-medium">{syn.term}</span>
                        {syn.meaning && (
                          <span className="text-slate-500 dark:text-slate-400"> ({syn.meaning})</span>
                        )}
                        {idx < word.synonyms.length - 1 && (
                          <span className="text-slate-300 dark:text-slate-600 ml-3">/</span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Antonyms
                </div>
                {word.antonyms.length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-800 dark:text-slate-200">
                    {word.antonyms.map((ant, idx) => (
                      <span key={`${ant.term}_${idx}`}>
                        <span className="font-medium">{ant.term}</span>
                        {ant.meaning && (
                          <span className="text-slate-500 dark:text-slate-400"> ({ant.meaning})</span>
                        )}
                        {idx < word.antonyms.length - 1 && (
                          <span className="text-slate-300 dark:text-slate-600 ml-3">/</span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
