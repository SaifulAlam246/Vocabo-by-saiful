import React, { useMemo } from 'react';
import { ArrowUpRight, Copy, RotateCw, Star } from 'lucide-react';
import { Lesson } from '../types/vocab';
import { sortLessons } from '../utils/numbering';
import { WordOccurrence } from '../components/WordDetailModal';

interface FavoritesViewProps {
  lessons: Lesson[];
  onToggleFavoriteWord: (lessonId: string, wordId: string) => void;
  onOpenLesson: (lessonId: string) => void;
  onReviseFavorites: () => void;
  onCopy: (text: string, label: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  lessons,
  onToggleFavoriteWord,
  onOpenLesson,
  onReviseFavorites,
  onCopy,
}) => {
  const favoriteItems = useMemo(() => {
    const items: WordOccurrence[] = [];
    for (const lesson of sortLessons(lessons)) {
      for (const word of lesson.words) {
        if (word.isFavorite) {
          items.push({ word, lesson });
        }
      }
    }
    return items;
  }, [lessons]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            Favorites
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Words you starred for quick access and focused revision.
          </p>
        </div>

        {favoriteItems.length > 0 && (
          <button
            type="button"
            onClick={onReviseFavorites}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <RotateCw className="w-4 h-4" />
            <span>Revise Favorites ({favoriteItems.length})</span>
          </button>
        )}
      </div>

      {favoriteItems.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <Star className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            No Favorite Words Yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Tap the star icon on any vocabulary card in a lesson or in the Vocabulary Library to
            save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favoriteItems.map(({ word, lesson }) => (
            <article
              key={`${lesson.id}_${word.id}`}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      Part {lesson.partNumber} · Lesson {lesson.lessonCode}
                      {word.partOfSpeech ? ` · ${word.partOfSpeech}` : ''}
                    </div>
                    <h2 className="mt-1 font-display font-bold text-xl text-slate-900 dark:text-slate-100">
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
                      aria-label={`Copy ${word.word}`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFavoriteWord(lesson.id, word.id)}
                      aria-label={`Remove ${word.word} from favorites`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 text-base font-medium text-slate-900 dark:text-slate-100">
                  {word.banglaMeaning || '—'}
                </p>

                {word.exampleSentence && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {word.exampleSentence}
                    </p>
                    {word.banglaTranslation && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {word.banglaTranslation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  Status: {word.revisionStatus === 'difficult' ? 'Need Practice' : word.revisionStatus}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenLesson(lesson.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Go to Lesson {lesson.lessonCode}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
