import React, { useMemo, useState } from 'react';
import { BookMarked, Copy, Search, Star } from 'lucide-react';
import { Lesson } from '../types/vocab';
import { sortLessons } from '../utils/numbering';
import { WordOccurrence } from '../components/WordDetailModal';

interface VocabularyLibraryViewProps {
  lessons: Lesson[];
  onSelectWordOccurrences: (occurrences: WordOccurrence[]) => void;
  onToggleFavoriteWord: (lessonId: string, wordId: string) => void;
  onCopy: (text: string, label: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ITEMS_PER_PAGE = 60;

export const VocabularyLibraryView: React.FC<VocabularyLibraryViewProps> = ({
  lessons,
  onSelectWordOccurrences,
  onToggleFavoriteWord,
  onCopy,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [partFilter, setPartFilter] = useState<string>('all');
  const [lessonFilter, setLessonFilter] = useState<string>('all');
  const [letterFilter, setLetterFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [groupDuplicates, setGroupDuplicates] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  const sortedLessons = useMemo(() => sortLessons(lessons), [lessons]);

  const partNumbers = useMemo(
    () => Array.from(new Set(sortedLessons.map((l) => l.partNumber))).sort((a, b) => a - b),
    [sortedLessons]
  );

  const availableLessonsForFilter = useMemo(() => {
    if (partFilter === 'all') return sortedLessons;
    return sortedLessons.filter((l) => l.partNumber === Number(partFilter));
  }, [sortedLessons, partFilter]);

  const filteredOccurrences = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const results: WordOccurrence[] = [];

    for (const lesson of sortedLessons) {
      if (partFilter !== 'all' && lesson.partNumber !== Number(partFilter)) continue;
      if (lessonFilter !== 'all' && lesson.id !== lessonFilter) continue;

      for (const word of lesson.words) {
        if (favoritesOnly && !word.isFavorite) continue;
        if (
          letterFilter !== 'all' &&
          !word.word.trim().toUpperCase().startsWith(letterFilter)
        ) {
          continue;
        }
        if (q) {
          const inWord = word.word.toLowerCase().includes(q);
          const inMeaning = word.banglaMeaning.toLowerCase().includes(q);
          const inSynonyms = word.synonyms.some(
            (s) =>
              s.term.toLowerCase().includes(q) || (s.meaning?.toLowerCase().includes(q) ?? false)
          );
          const inAntonyms = word.antonyms.some(
            (a) =>
              a.term.toLowerCase().includes(q) || (a.meaning?.toLowerCase().includes(q) ?? false)
          );
          if (!inWord && !inMeaning && !inSynonyms && !inAntonyms) continue;
        }
        results.push({ word, lesson });
      }
    }

    return results;
  }, [sortedLessons, partFilter, lessonFilter, favoritesOnly, letterFilter, searchQuery]);

  // Intelligent duplicate grouping without losing lesson-specific entries
  const displayGroups = useMemo(() => {
    if (!groupDuplicates) {
      return filteredOccurrences.map((occ) => ({
        key: `${occ.lesson.id}_${occ.word.id}`,
        primary: occ,
        occurrences: [occ],
      }));
    }

    const map = new Map<string, WordOccurrence[]>();
    for (const occ of filteredOccurrences) {
      const normalizedKey = occ.word.word.trim().toLowerCase();
      const arr = map.get(normalizedKey) ?? [];
      arr.push(occ);
      map.set(normalizedKey, arr);
    }

    return Array.from(map.entries()).map(([key, occurrences]) => ({
      key,
      primary: occurrences[0],
      occurrences,
    }));
  }, [filteredOccurrences, groupDuplicates]);

  const totalPages = Math.max(1, Math.ceil(displayGroups.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedGroups = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return displayGroups.slice(start, start + ITEMS_PER_PAGE);
  }, [displayGroups, safePage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            Vocabulary Library
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search across all words, Bangla meanings, synonyms, and antonyms.
          </p>
        </div>

        <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
          {filteredOccurrences.length} entries · {displayGroups.length} unique shown
        </div>
      </div>

      {/* Search & Filter Panel */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search English word, Bangla meaning, synonyms, antonyms..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={partFilter}
              onChange={(e) => {
                setPartFilter(e.target.value);
                setLessonFilter('all');
                setPage(1);
              }}
              aria-label="Filter by Part"
              className="px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Parts</option>
              {partNumbers.map((num) => (
                <option key={num} value={String(num)}>
                  Part {num}
                </option>
              ))}
            </select>

            <select
              value={lessonFilter}
              onChange={(e) => {
                setLessonFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Lesson"
              className="px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Lessons</option>
              {availableLessonsForFilter.map((l) => (
                <option key={l.id} value={l.id}>
                  Lesson {l.lessonCode}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setFavoritesOnly((v) => !v);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                favoritesOnly
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
              <span>Favorites</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGroupDuplicates((v) => !v);
                setPage(1);
              }}
              className={`px-3 py-2 min-h-[42px] rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                groupDuplicates
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {groupDuplicates ? 'Grouped Duplicates' : 'All Occurrences'}
            </button>
          </div>
        </div>

        {/* Alphabet Filter Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setLetterFilter('all');
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors ${
              letterFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => {
                setLetterFilter(letter);
                setPage(1);
              }}
              className={`w-7 h-7 rounded-md text-xs font-mono-num font-medium shrink-0 transition-colors ${
                letterFilter === letter
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </section>

      {/* Results List */}
      {displayGroups.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <BookMarked className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            No Vocabulary Words Match
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try adjusting your search query or clearing filters.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {pagedGroups.map(({ key, primary, occurrences }) => {
            const { word, lesson } = primary;
            const anyFavorite = occurrences.some((o) => o.word.isFavorite);
            return (
              <div
                key={key}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelectWordOccurrences(occurrences)}
                  className="flex-1 text-left min-w-0 focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                      {word.word}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {[
                        word.partOfSpeech,
                        word.cefrLevel,
                        occurrences.length > 1
                          ? `${occurrences.length} lessons (${occurrences
                              .map((o) => o.lesson.lessonCode)
                              .join(', ')})`
                          : `Lesson ${lesson.lessonCode}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {word.banglaMeaning || '—'}
                  </p>
                  {word.exampleSentence && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {word.exampleSentence}
                    </p>
                  )}
                </button>

                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      onCopy(`${word.word} — ${word.banglaMeaning}`, `"${word.word}"`)
                    }
                    aria-label={`Copy ${word.word}`}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavoriteWord(lesson.id, word.id)}
                    aria-label={`Favorite ${word.word}`}
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${
                      anyFavorite
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${anyFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectWordOccurrences(occurrences)}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono-num">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, displayGroups.length)} of{' '}
                {displayGroups.length} (Page {safePage} of {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-2 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-2 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
