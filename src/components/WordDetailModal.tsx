import React, { useState } from 'react';
import { ArrowUpRight, Copy, Star, X } from 'lucide-react';
import { Lesson, VocabWord } from '../types/vocab';

export interface WordOccurrence {
  word: VocabWord;
  lesson: Lesson;
}

interface WordDetailModalProps {
  occurrences: WordOccurrence[];
  initialIndex?: number;
  onClose: () => void;
  onToggleFavorite: (lessonId: string, wordId: string) => void;
  onOpenLesson: (lessonId: string) => void;
  onCopy: (text: string, label: string) => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  occurrences,
  initialIndex = 0,
  onClose,
  onToggleFavorite,
  onOpenLesson,
  onCopy,
}) => {
  const [activeIdx, setActiveIdx] = useState(
    Math.min(initialIndex, Math.max(0, occurrences.length - 1))
  );

  if (occurrences.length === 0) return null;

  const current = occurrences[activeIdx] ?? occurrences[0];
  const { word, lesson } = current;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono-num">Part {lesson.partNumber}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">Lesson {lesson.lessonCode}</span>
              {word.partOfSpeech && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{word.partOfSpeech}</span>
                </>
              )}
              {word.cefrLevel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{word.cefrLevel}</span>
                </>
              )}
            </div>
            <h2
              id="word-modal-title"
              className="mt-1 font-display font-bold text-2xl text-slate-900 dark:text-slate-100"
            >
              {word.word}
            </h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                onCopy(
                  `${word.word} — ${word.banglaMeaning}\nExample: ${word.exampleSentence}`,
                  `"${word.word}"`
                )
              }
              aria-label="Copy word details"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(lesson.id, word.id)}
              aria-label="Toggle favorite"
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${
                word.isFavorite
                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`w-4 h-4 ${word.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If duplicated across multiple lessons, let user switch between occurrences */}
        {occurrences.length > 1 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Appears in {occurrences.length} lessons — select context:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {occurrences.map((occ, idx) => (
                <button
                  key={`${occ.lesson.id}_${occ.word.id}`}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors font-mono-num ${
                    idx === activeIdx
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Lesson {occ.lesson.lessonCode}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Bangla Meaning
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
              {word.banglaMeaning || '—'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Example Sentence
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Synonyms
              </div>
              {word.synonyms.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                  {word.synonyms.map((s, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{s.term}</span>
                      {s.meaning && (
                        <span className="text-slate-500 dark:text-slate-400"> ({s.meaning})</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Antonyms
              </div>
              {word.antonyms.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                  {word.antonyms.map((a, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{a.term}</span>
                      {a.meaning && (
                        <span className="text-slate-500 dark:text-slate-400"> ({a.meaning})</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Revision status:{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                {word.revisionStatus}
              </span>
              {word.reviewCount > 0 && (
                <span className="font-mono-num"> · Reviewed {word.reviewCount}×</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLesson(lesson.id);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <span>Open Lesson {lesson.lessonCode}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
