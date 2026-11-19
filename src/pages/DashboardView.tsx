import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenText,
  Brain,
  CheckCircle2,
  HelpCircle,
  PlusCircle,
  RotateCw,
  Search,
  Star,
} from 'lucide-react';
import { AppPage, Lesson, PartRecord } from '../types/vocab';
import { groupLessonsIntoParts, sortLessons } from '../utils/numbering';
import { WordOccurrence } from '../components/WordDetailModal';

interface DashboardViewProps {
  lessons: Lesson[];
  partRecords?: PartRecord[];
  lessonsPerPart: number;
  canManageContent?: boolean;
  onNavigate: (page: AppPage) => void;
  onNavigateAddLesson: () => void;
  onOpenLesson: (lessonId: string) => void;
  onSelectWord: (occurrences: WordOccurrence[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lessons,
  partRecords = [],
  lessonsPerPart,
  canManageContent = true,
  onNavigate,
  onNavigateAddLesson,
  onOpenLesson,
  onSelectWord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const parts = groupLessonsIntoParts(lessons, lessonsPerPart, partRecords);
    const totalParts = parts.length;
    const totalLessons = lessons.length;
    const totalWords = lessons.reduce((sum, l) => sum + l.words.length, 0);
    const completedLessons = lessons.filter((l) => l.completed).length;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      totalParts,
      totalLessons,
      totalWords,
      completedLessons,
      progressPercent,
    };
  }, [lessons, lessonsPerPart, partRecords]);

  // Determine the lesson for "Continue Learning"
  const continueLesson = useMemo(() => {
    if (lessons.length === 0) return null;
    const sorted = sortLessons(lessons);
    const incomplete = sorted.filter((l) => !l.completed);

    if (incomplete.length > 0) {
      const recentlyStudiedIncomplete = [...incomplete]
        .filter((l) => Boolean(l.lastStudiedAt))
        .sort((a, b) => (b.lastStudiedAt || '').localeCompare(a.lastStudiedAt || ''));
      if (recentlyStudiedIncomplete.length > 0) {
        return recentlyStudiedIncomplete[0];
      }
      return incomplete[0];
    }

    const byRecent = [...sorted].sort((a, b) =>
      (b.lastStudiedAt || b.updatedAt).localeCompare(a.lastStudiedAt || a.updatedAt)
    );
    return byRecent[0];
  }, [lessons]);

  const recentLessons = useMemo(() => {
    return [...lessons]
      .sort((a, b) => {
        const aTime = a.lastStudiedAt || a.updatedAt || a.createdAt;
        const bTime = b.lastStudiedAt || b.updatedAt || b.createdAt;
        return bTime.localeCompare(aTime);
      })
      .slice(0, 5);
  }, [lessons]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: WordOccurrence[] = [];
    for (const lesson of sortLessons(lessons)) {
      for (const word of lesson.words) {
        const inWord = word.word.toLowerCase().includes(q);
        const inMeaning = word.banglaMeaning.toLowerCase().includes(q);
        const inSynonyms = word.synonyms.some(
          (s) => s.term.toLowerCase().includes(q) || (s.meaning?.toLowerCase().includes(q) ?? false)
        );
        const inAntonyms = word.antonyms.some(
          (a) => a.term.toLowerCase().includes(q) || (a.meaning?.toLowerCase().includes(q) ?? false)
        );

        if (inWord || inMeaning || inSynonyms || inAntonyms) {
          matches.push({ word, lesson });
        }
      }
    }
    return matches.slice(0, 12);
  }, [lessons, searchQuery]);

  const practiceTools: Array<{
    id: AppPage;
    title: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'flashcards',
      title: 'Flashcards',
      subtitle: 'Flip & swipe cards',
      icon: Brain,
    },
    {
      id: 'quiz',
      title: 'Quiz',
      subtitle: '5 challenge formats',
      icon: HelpCircle,
    },
    {
      id: 'revision',
      title: 'Daily Revision',
      subtitle: 'Spaced repetition',
      icon: RotateCw,
    },
    {
      id: 'reading',
      title: 'Reading Mode',
      subtitle: 'Stories & practice',
      icon: BookOpenText,
    },
    {
      id: 'progress',
      title: 'Progress Tracker',
      subtitle: 'Streaks & charts',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-7">
      {/* Welcome Hero Row */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 tracking-wide">
              Vocabo by Saiful · Oxford 3000 Study Workspace
            </div>
            <h1 className="mt-2 font-display font-bold text-2xl sm:text-3xl tracking-tight text-slate-900 dark:text-slate-100 text-balance">
              Learn Words. Build Fluency.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Study structured 10-word Oxford batches with Bangla meanings, real examples,
              contextual stories, interactive quizzes, and daily spaced revision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {continueLesson ? (
              <button
                type="button"
                onClick={() => onOpenLesson(continueLesson.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <span>Continue Learning · Lesson {continueLesson.lessonCode}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : canManageContent ? (
              <button
                type="button"
                onClick={onNavigateAddLesson}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add First Lesson</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('parts-lessons')}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <span>Browse Parts &amp; Lessons</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {canManageContent && (
              <button
                type="button"
                onClick={onNavigateAddLesson}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Lesson</span>
              </button>
            )}
          </div>
        </div>

        {/* Learning Progress Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Overall Lesson Completion
            </span>
            <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
              {stats.completedLessons} / {stats.totalLessons} lessons ({stats.progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 5 Key Metrics Grid */}
      <section aria-label="Learning Metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Parts</div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalParts}
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Lessons</div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalLessons}
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Vocabulary Words
          </div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalWords}
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed Lessons
          </div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.completedLessons}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.progressPercent}%
          </div>
        </div>
      </section>

      {/* Practice & Learning Modes Strip */}
      <section aria-label="Learning Tools" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {practiceTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.id)}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2.5" />
              <div className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tool.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tool.subtitle}
              </div>
            </button>
          );
        })}
      </section>

      {/* Search Vocabulary + Recently Studied Two-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Quick Vocabulary Search */}
        <section className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Search Vocabulary
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open Library
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search English word, Bangla meaning, synonyms, antonyms..."
              aria-label="Search vocabulary"
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="mt-4">
            {!searchQuery.trim() ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                Type any English word, Bangla meaning, synonym, or antonym to look it up instantly.
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No vocabulary entries matched &ldquo;{searchQuery}&rdquo;.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {searchResults.map((occ) => (
                  <button
                    key={`${occ.lesson.id}_${occ.word.id}`}
                    type="button"
                    onClick={() => onSelectWord([occ])}
                    className="w-full py-3 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {occ.word.word}
                        </span>
                        {occ.word.isFavorite && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                        )}
                        <span className="text-xs font-mono-num text-slate-400">
                          Lesson {occ.lesson.lessonCode}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate mt-0.5">
                        {occ.word.banglaMeaning}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recently Studied Lessons */}
        <section className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-slate-100">
              Recently Studied Lessons
            </h2>
            <span className="text-xs font-mono-num text-slate-400">
              {recentLessons.length} shown
            </span>
          </div>

          {recentLessons.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {canManageContent
                  ? 'No lessons saved yet. Paste your first 10-word batch to begin.'
                  : 'No lessons published yet.'}
              </p>
              {canManageContent && (
                <button
                  type="button"
                  onClick={onNavigateAddLesson}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add New Lesson</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onOpenLesson(lesson.id)}
                  className="w-full py-3.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                        Part {lesson.partNumber} · Lesson {lesson.lessonCode}
                      </span>
                      <span className="text-xs font-mono-num text-slate-400 dark:text-slate-500">
                        Words {lesson.wordRangeStart}–{lesson.wordRangeEnd}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {lesson.words.map((w) => w.word).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span className="text-xs text-slate-400">Study</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
