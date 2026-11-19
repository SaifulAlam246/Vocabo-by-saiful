import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Play,
  RotateCw,
} from 'lucide-react';
import { Lesson, RevisionSessionRecord } from '../types/vocab';
import {
  buildDailyRevisionQueue,
  isWordDueForReview,
  WordWithLesson,
} from '../utils/spacedRepetition';

interface DailyRevisionViewProps {
  lessons: Lesson[];
  dailyTarget: 10 | 20 | 30;
  revisionHistory: RevisionSessionRecord[];
  initialFilterFavorites?: boolean;
  onChangeDailyTarget: (target: 10 | 20 | 30) => void;
  onMarkWord: (lessonId: string, wordId: string, outcome: 'known' | 'difficult') => void;
  onCompleteRevisionSession: (record: RevisionSessionRecord) => void;
  onNavigateAddLesson: () => void;
}

export const DailyRevisionView: React.FC<DailyRevisionViewProps> = ({
  lessons,
  dailyTarget,
  revisionHistory,
  initialFilterFavorites = false,
  onChangeDailyTarget,
  onMarkWord,
  onCompleteRevisionSession,
  onNavigateAddLesson,
}) => {
  const [recallDirection, setRecallDirection] = useState<'en-to-bn' | 'bn-to-en'>('en-to-bn');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(initialFilterFavorites);
  const [sessionActive, setSessionActive] = useState(false);
  const [queue, setQueue] = useState<WordWithLesson[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionOutcomes, setSessionOutcomes] = useState<Record<string, 'known' | 'difficult'>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const summary = useMemo(() => {
    let totalWords = 0;
    let dueCount = 0;
    let difficultCount = 0;
    let knownCount = 0;

    for (const l of lessons) {
      for (const w of l.words) {
        totalWords++;
        if (isWordDueForReview(w)) dueCount++;
        if (w.revisionStatus === 'difficult') difficultCount++;
        if (w.revisionStatus === 'known') knownCount++;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCompletedWords = revisionHistory
      .filter((r) => r.date.slice(0, 10) === todayStr)
      .reduce((sum, r) => sum + r.completedCount, 0);

    return {
      totalWords,
      dueCount,
      difficultCount,
      knownCount,
      todayCompletedWords,
    };
  }, [lessons, revisionHistory]);

  const startSession = () => {
    let selected = buildDailyRevisionQueue(lessons, favoritesOnly ? 999 : dailyTarget);
    if (favoritesOnly) {
      selected = selected.filter((item) => item.word.isFavorite).slice(0, dailyTarget);
    }
    setQueue(selected);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionOutcomes({});
    setSessionCompleted(false);
    setSessionActive(true);
  };

  // Sync live word stats inside active queue
  const currentEntry = useMemo(() => {
    const item = queue[currentIndex];
    if (!item) return null;
    const latestLesson = lessons.find((l) => l.id === item.lesson.id) ?? item.lesson;
    const latestWord =
      latestLesson.words.find((w) => w.id === item.word.id) ?? item.word;
    return { ...item, lesson: latestLesson, word: latestWord };
  }, [queue, currentIndex, lessons]);

  const handleMark = (outcome: 'known' | 'difficult') => {
    if (!currentEntry) return;
    onMarkWord(currentEntry.lesson.id, currentEntry.word.id, outcome);

    const updatedOutcomes = { ...sessionOutcomes, [currentEntry.word.id]: outcome };
    setSessionOutcomes(updatedOutcomes);

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      const vals = Object.values(updatedOutcomes);
      const knownCount = vals.filter((v) => v === 'known').length;
      const difficultCount = vals.filter((v) => v === 'difficult').length;

      onCompleteRevisionSession({
        id: `rev_sess_${Date.now()}`,
        date: new Date().toISOString(),
        targetCount: queue.length,
        completedCount: vals.length,
        knownCount,
        difficultCount,
      });
      setSessionCompleted(true);
      setShowAnswer(false);
    }
  };

  const formatDateShort = (iso?: string) => {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
          Daily Revision
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Spaced repetition prioritizes Difficult words, missed quiz words, and due vocabulary.
        </p>
      </div>

      {summary.totalWords === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <RotateCw className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            No Vocabulary Available Yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add your first lesson to start daily spaced repetition sessions.
          </p>
          <button
            type="button"
            onClick={onNavigateAddLesson}
            className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Add New Lesson
          </button>
        </div>
      ) : !sessionActive ? (
        <div className="space-y-6">
          {/* Status Overview */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Due for Review</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.dueCount}
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Difficult Priority</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.difficultCount}
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Revised Today</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.todayCompletedWords}
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Sessions Done</div>
              <div className="mt-1 font-mono-num text-2xl font-bold text-slate-900 dark:text-slate-100">
                {revisionHistory.length}
              </div>
            </div>
          </section>

          {/* Session Setup Card */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Daily Word Target
                </label>
                <div className="flex items-center gap-2">
                  {([10, 20, 30] as const).map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => onChangeDailyTarget(target)}
                      className={`flex-1 py-2.5 min-h-[42px] rounded-lg text-sm font-mono-num font-semibold border transition-colors ${
                        dailyTarget === target
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {target} words
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Recall Direction
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecallDirection('en-to-bn')}
                    className={`flex-1 py-2.5 min-h-[42px] rounded-lg text-xs font-semibold border transition-colors ${
                      recallDirection === 'en-to-bn'
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    English → Bangla
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecallDirection('bn-to-en')}
                    className={`flex-1 py-2.5 min-h-[42px] rounded-lg text-xs font-semibold border transition-colors ${
                      recallDirection === 'bn-to-en'
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    Bangla → English
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>Favorites only</span>
              </label>

              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Daily Revision</span>
              </button>
            </div>
          </section>

          {/* Revision History */}
          {revisionHistory.length > 0 && (
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 mb-3">
                Revision History
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {revisionHistory.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateShort(item.date)}</span>
                    </div>
                    <div className="font-mono-num text-slate-700 dark:text-slate-200">
                      {item.completedCount} reviewed ·{' '}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {item.knownCount} known
                      </span>{' '}
                      ·{' '}
                      <span className="text-amber-600 dark:text-amber-400">
                        {item.difficultCount} difficult
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : sessionCompleted ? (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100">
            Daily Revision Complete
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You reviewed{' '}
            <span className="font-mono-num font-semibold">{Object.keys(sessionOutcomes).length}</span>{' '}
            words. Next review dates have been scheduled automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={startSession}
              className="px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Start Another Session
            </button>
            <button
              type="button"
              onClick={() => setSessionActive(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Back to Overview
            </button>
          </div>
        </section>
      ) : queue.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No words matched your selected filter for revision.
          </p>
          <button
            type="button"
            onClick={() => setSessionActive(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700"
          >
            Back
          </button>
        </div>
      ) : (
        currentEntry && (
          <div className="space-y-4">
            {/* Session Progress */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num text-slate-500 dark:text-slate-400">
              <span>
                Word {currentIndex + 1} of {queue.length} · Lesson {currentEntry.lesson.lessonCode}
              </span>
              <button
                type="button"
                onClick={() => setSessionActive(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 underline font-sans"
              >
                End Session
              </button>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{
                  width: `${Math.round(((currentIndex + 1) / queue.length) * 100)}%`,
                }}
              />
            </div>

            {/* Revision Card */}
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {recallDirection === 'en-to-bn' ? 'English → Bangla' : 'Bangla → English'}
                  {currentEntry.word.partOfSpeech ? ` · ${currentEntry.word.partOfSpeech}` : ''}
                </span>
                <span className="font-mono-num">
                  Reviews: {currentEntry.word.reviewCount} · Correct:{' '}
                  {currentEntry.word.correctCount ?? 0} · Wrong:{' '}
                  {currentEntry.word.incorrectCount ?? 0}
                </span>
              </div>

              <div className="py-4 text-center space-y-2">
                <div className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-slate-100">
                  {recallDirection === 'en-to-bn'
                    ? currentEntry.word.word
                    : currentEntry.word.banglaMeaning || '—'}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  Last reviewed: {formatDateShort(currentEntry.word.lastReviewedAt)} · Next due:{' '}
                  {currentEntry.word.nextReviewAt
                    ? formatDateShort(currentEntry.word.nextReviewAt)
                    : 'Now'}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAnswer((s) => !s)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showAnswer ? 'Hide Answer' : 'Show Answer'}</span>
                </button>
              </div>

              {showAnswer && (
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {recallDirection === 'en-to-bn' ? 'Bangla Meaning' : 'English Word'}
                    </div>
                    <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-300">
                      {recallDirection === 'en-to-bn'
                        ? currentEntry.word.banglaMeaning || '—'
                        : currentEntry.word.word}
                    </p>
                  </div>

                  {currentEntry.word.exampleSentence && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Example
                      </div>
                      <p className="mt-0.5 text-sm sm:text-base text-slate-800 dark:text-slate-200">
                        {currentEntry.word.exampleSentence}
                      </p>
                      {currentEntry.word.banglaTranslation && (
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                          {currentEntry.word.banglaTranslation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setCurrentIndex((i) => Math.max(0, i - 1));
                    setShowAnswer(false);
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={currentIndex + 1 >= queue.length}
                  onClick={() => {
                    setCurrentIndex((i) => Math.min(queue.length - 1, i + 1));
                    setShowAnswer(false);
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  <span>Skip</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMark('difficult')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Mark Difficult</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMark('known')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Known</span>
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
