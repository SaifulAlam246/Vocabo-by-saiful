import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Star,
} from 'lucide-react';
import { Lesson, VocabWord } from '../types/vocab';
import { sortLessons } from '../utils/numbering';

interface FlashcardsViewProps {
  lessons: Lesson[];
  initialScope?: 'all' | 'favorites' | 'difficult';
  onMarkWord: (lessonId: string, wordId: string, outcome: 'known' | 'difficult') => void;
  onToggleFavorite: (lessonId: string, wordId: string) => void;
  onNavigateAddLesson: () => void;
}

interface FlashcardEntry {
  word: VocabWord;
  lesson: Lesson;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  lessons,
  initialScope = 'all',
  onMarkWord,
  onToggleFavorite,
  onNavigateAddLesson,
}) => {
  const [scope, setScope] = useState<'all' | 'part' | 'lesson' | 'favorites' | 'difficult'>(
    initialScope
  );
  const [selectedPart, setSelectedPart] = useState<string>('1');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);
  const [sessionReviewed, setSessionReviewed] = useState<Record<string, 'known' | 'difficult'>>({});

  // Mobile touch swipe tracking
  const touchStartX = useRef<number | null>(null);

  const sortedLessons = useMemo(() => sortLessons(lessons), [lessons]);
  const partNumbers = useMemo(
    () => Array.from(new Set(sortedLessons.map((l) => l.partNumber))).sort((a, b) => a - b),
    [sortedLessons]
  );

  useEffect(() => {
    if (partNumbers.length > 0 && !partNumbers.includes(Number(selectedPart))) {
      setSelectedPart(String(partNumbers[0]));
    }
    if (sortedLessons.length > 0 && !sortedLessons.some((l) => l.id === selectedLessonId)) {
      setSelectedLessonId(sortedLessons[0].id);
    }
  }, [partNumbers, sortedLessons, selectedPart, selectedLessonId]);

  const baseEntries = useMemo(() => {
    const list: FlashcardEntry[] = [];
    for (const lesson of sortedLessons) {
      if (scope === 'part' && lesson.partNumber !== Number(selectedPart)) continue;
      if (scope === 'lesson' && lesson.id !== selectedLessonId) continue;

      for (const word of lesson.words) {
        if (scope === 'favorites' && !word.isFavorite) continue;
        if (scope === 'difficult' && word.revisionStatus !== 'difficult') continue;
        list.push({ word, lesson });
      }
    }
    return list;
  }, [sortedLessons, scope, selectedPart, selectedLessonId, shuffledOrder]);

  const deck = useMemo(() => {
    if (!shuffledOrder) return baseEntries;
    const orderMap = new Map(shuffledOrder.map((id, idx) => [id, idx]));
    return [...baseEntries].sort((a, b) => {
      const ia = orderMap.get(a.word.id) ?? 999999;
      const ib = orderMap.get(b.word.id) ?? 999999;
      return ia - ib;
    });
  }, [baseEntries, shuffledOrder]);

  const safeIndex = deck.length > 0 ? Math.min(currentIndex, deck.length - 1) : 0;
  const activeEntry = deck[safeIndex];

  const handleScopeChange = (
    nextScope: 'all' | 'part' | 'lesson' | 'favorites' | 'difficult'
  ) => {
    setScope(nextScope);
    setShuffledOrder(null);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const handleShuffle = () => {
    const ids = baseEntries.map((e) => e.word.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffledOrder(ids);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const goNext = () => {
    if (deck.length <= 1) return;
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < deck.length ? prev + 1 : 0));
  };

  const goPrev = () => {
    if (deck.length <= 1) return;
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : deck.length - 1));
  };

  const handleOutcome = (outcome: 'known' | 'difficult') => {
    if (!activeEntry) return;
    onMarkWord(activeEntry.lesson.id, activeEntry.word.id, outcome);
    setSessionReviewed((prev) => ({ ...prev, [activeEntry.word.id]: outcome }));
    if (safeIndex + 1 < deck.length) {
      setFlipped(false);
      setCurrentIndex(safeIndex + 1);
    } else {
      setFlipped(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) > 55) {
      if (delta < 0) goNext();
      else goPrev();
    }
  };

  const sessionCount = Object.keys(sessionReviewed).length;
  const progressPercent =
    deck.length > 0 ? Math.round(((safeIndex + 1) / deck.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            Word Flashcards
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tap card to flip · Swipe left/right on mobile · Track Known vs Need Practice.
          </p>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          disabled={deck.length <= 1}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Shuffle Deck</span>
        </button>
      </div>

      {/* Filter Bar */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Words' },
              { id: 'part', label: 'By Part' },
              { id: 'lesson', label: 'By Lesson' },
              { id: 'favorites', label: 'Favorites' },
              { id: 'difficult', label: 'Need Practice' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleScopeChange(tab.id)}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                scope === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {scope === 'part' && partNumbers.length > 0 && (
          <select
            value={selectedPart}
            onChange={(e) => {
              setSelectedPart(e.target.value);
              setCurrentIndex(0);
              setFlipped(false);
            }}
            aria-label="Select Part"
            className="w-full sm:w-64 px-3 py-2 min-h-[40px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200"
          >
            {partNumbers.map((num) => (
              <option key={num} value={String(num)}>
                Part {num}
              </option>
            ))}
          </select>
        )}

        {scope === 'lesson' && sortedLessons.length > 0 && (
          <select
            value={selectedLessonId}
            onChange={(e) => {
              setSelectedLessonId(e.target.value);
              setCurrentIndex(0);
              setFlipped(false);
            }}
            aria-label="Select Lesson"
            className="w-full sm:w-72 px-3 py-2 min-h-[40px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200"
          >
            {sortedLessons.map((l) => (
              <option key={l.id} value={l.id}>
                Part {l.partNumber} · Lesson {l.lessonCode} ({l.words.length} words)
              </option>
            ))}
          </select>
        )}
      </section>

      {deck.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lessons.length === 0
              ? 'No vocabulary words saved yet. Add a lesson first to study flashcards.'
              : 'No words match the selected flashcard filter.'}
          </p>
          {lessons.length === 0 && (
            <button
              type="button"
              onClick={onNavigateAddLesson}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Add New Lesson
            </button>
          )}
        </div>
      ) : (
        activeEntry && (
          <div className="space-y-4">
            {/* Session Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                <span>
                  Card {safeIndex + 1} of {deck.length}
                </span>
                <span>{sessionCount} reviewed this session</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Interactive Flip Flashcard */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative"
              style={{ perspective: '1200px' }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setFlipped((f) => !f);
                  }
                }}
                aria-label="Flip flashcard"
                className="relative w-full min-h-[320px] sm:min-h-[360px] cursor-pointer select-none transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* FRONT SIDE */}
                <div
                  className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-sm"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      Lesson {activeEntry.lesson.lessonCode}
                      {activeEntry.word.partOfSpeech ? ` · ${activeEntry.word.partOfSpeech}` : ''}
                      {activeEntry.word.cefrLevel ? ` · ${activeEntry.word.cefrLevel}` : ''}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          activeEntry.word.revisionStatus === 'known'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : activeEntry.word.revisionStatus === 'difficult'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {activeEntry.word.revisionStatus === 'known'
                          ? 'Known'
                          : activeEntry.word.revisionStatus === 'difficult'
                            ? 'Need Practice'
                            : 'New'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(activeEntry.lesson.id, activeEntry.word.id);
                        }}
                        aria-label="Toggle favorite"
                        className={`p-1.5 rounded-lg ${
                          activeEntry.word.isFavorite
                            ? 'text-amber-500'
                            : 'text-slate-300 hover:text-amber-500 dark:text-slate-600'
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 ${activeEntry.word.isFavorite ? 'fill-current' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="my-auto text-center py-6">
                    <div className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-slate-900 dark:text-slate-100 break-words">
                      {activeEntry.word.word}
                    </div>
                  </div>

                  <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                    Tap card to reveal Bangla meaning &amp; example
                  </div>
                </div>

                {/* BACK SIDE */}
                <div
                  className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 p-6 sm:p-8 flex flex-col justify-between shadow-sm overflow-y-auto"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
                      {activeEntry.word.word}
                    </span>
                    <span className="text-xs font-mono-num text-slate-400">
                      Lesson {activeEntry.lesson.lessonCode}
                    </span>
                  </div>

                  <div className="my-auto py-4 space-y-4">
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Bangla Meaning
                      </div>
                      <p className="text-xl sm:text-2xl font-semibold text-blue-700 dark:text-blue-300 leading-snug">
                        {activeEntry.word.banglaMeaning || '—'}
                      </p>
                    </div>

                    {activeEntry.word.exampleSentence && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Example &amp; Translation
                        </div>
                        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                          {activeEntry.word.exampleSentence}
                        </p>
                        {activeEntry.word.banglaTranslation && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {activeEntry.word.banglaTranslation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                    Tap card to flip back
                  </div>
                </div>
              </div>
            </div>

            {/* Action & Navigation Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOutcome('difficult')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Need Practice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOutcome('known')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Known</span>
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
