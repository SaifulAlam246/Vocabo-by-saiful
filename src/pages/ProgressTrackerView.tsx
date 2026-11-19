import React, { useMemo } from 'react';
import { Award, BarChart3, Calendar, CheckCircle2, Flame } from 'lucide-react';
import { ActivityStats, Lesson } from '../types/vocab';
import { groupLessonsIntoParts } from '../utils/numbering';
import { calculateStreakMetrics } from '../utils/spacedRepetition';
import { getLocalDateString } from '../utils/storage';

interface ProgressTrackerViewProps {
  lessons: Lesson[];
  lessonsPerPart: number;
  activity: ActivityStats;
}

export const ProgressTrackerView: React.FC<ProgressTrackerViewProps> = ({
  lessons,
  lessonsPerPart,
  activity,
}) => {
  const metrics = useMemo(() => {
    const parts = groupLessonsIntoParts(lessons, lessonsPerPart);
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l) => l.completed).length;
    const completedParts = parts.filter(
      (p) => p.lessons.length >= lessonsPerPart && p.completedLessons >= p.lessons.length
    ).length;

    let totalWords = 0;
    let knownWords = 0;
    let difficultWords = 0;
    let newWords = 0;

    for (const lesson of lessons) {
      for (const word of lesson.words) {
        totalWords++;
        if (word.revisionStatus === 'known') knownWords++;
        else if (word.revisionStatus === 'difficult') difficultWords++;
        else newWords++;
      }
    }

    const masteryPercent =
      totalWords > 0 ? Math.round((knownWords / totalWords) * 100) : 0;

    const totalQuizAttempts = activity.quizHistory.length;
    const averageQuizScore =
      totalQuizAttempts > 0
        ? Math.round(
            activity.quizHistory.reduce((sum, q) => sum + q.accuracy, 0) / totalQuizAttempts
          )
        : 0;

    const streak = calculateStreakMetrics(activity.activeDates);

    // Build last 7 days activity series
    const weeklySeries: Array<{ label: string; dateStr: string; count: number }> = [];
    const today = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const dateStr = getLocalDateString(d);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      weeklySeries.push({
        label,
        dateStr,
        count: activity.dailyActivityCounts[dateStr] ?? 0,
      });
    }

    const maxWeeklyCount = Math.max(1, ...weeklySeries.map((w) => w.count));

    return {
      parts,
      totalParts: parts.length,
      completedParts,
      totalLessons,
      completedLessons,
      totalWords,
      knownWords,
      difficultWords,
      newWords,
      masteryPercent,
      totalRevisionSessions: activity.revisionHistory.length,
      totalReadingCompleted: activity.readingHistory.filter((r) => r.completed).length,
      totalQuizAttempts,
      averageQuizScore,
      streak,
      weeklySeries,
      maxWeeklyCount,
    };
  }, [lessons, lessonsPerPart, activity]);

  const knownPct =
    metrics.totalWords > 0
      ? Math.round((metrics.knownWords / metrics.totalWords) * 100)
      : 0;
  const difficultPct =
    metrics.totalWords > 0
      ? Math.round((metrics.difficultWords / metrics.totalWords) * 100)
      : 0;
  const newPct = Math.max(0, 100 - knownPct - difficultPct);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
          Progress Tracker
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real learning progress calculated from your completed lessons, quizzes, revisions, and
          stories.
        </p>
      </div>

      {/* Learning Streak Banner */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Current Streak
            </div>
            <div className="font-mono-num text-2xl font-bold text-slate-900 dark:text-slate-100">
              {metrics.streak.currentStreak}{' '}
              <span className="text-xs font-normal text-slate-500">days</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Longest Streak
            </div>
            <div className="font-mono-num text-2xl font-bold text-slate-900 dark:text-slate-100">
              {metrics.streak.longestStreak}{' '}
              <span className="text-xs font-normal text-slate-500">days</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Active Days
            </div>
            <div className="font-mono-num text-2xl font-bold text-slate-900 dark:text-slate-100">
              {metrics.streak.totalActiveDays}
            </div>
          </div>
        </div>
      </section>

      {/* Overall Progress & Learning Activity Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 mb-4">
            Overall Progress
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Words Learned</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.knownWords}{' '}
                <span className="text-xs font-normal text-slate-400">/ {metrics.totalWords}</span>
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Mastery Rate</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.masteryPercent}%
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Lessons Completed</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.completedLessons}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {metrics.totalLessons}
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Parts Completed</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.completedParts}{' '}
                <span className="text-xs font-normal text-slate-400">/ {metrics.totalParts}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 mb-4">
            Learning Activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Revision Sessions</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.totalRevisionSessions}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Quiz Attempts</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.totalQuizAttempts}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Avg Quiz Score</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.averageQuizScore}%
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Marked Known</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.knownWords}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Marked Difficult</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-amber-600 dark:text-amber-400">
                {metrics.difficultWords}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Stories Read</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.totalReadingCompleted}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Vocabulary Learning Progress Chart */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Vocabulary Learning Progress
            </h2>
            <span className="font-mono-num text-xs text-slate-500">{metrics.totalWords} total</span>
          </div>

          {metrics.totalWords === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No vocabulary words yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${knownPct}%` }}
                  title={`Known: ${metrics.knownWords}`}
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${difficultPct}%` }}
                  title={`Difficult: ${metrics.difficultWords}`}
                />
                <div
                  className="bg-slate-300 dark:bg-slate-700 h-full transition-all duration-300"
                  style={{ width: `${newPct}%` }}
                  title={`New: ${metrics.newWords}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Known</div>
                  <div className="font-mono-num text-base font-bold text-slate-900 dark:text-slate-100">
                    {metrics.knownWords} ({knownPct}%)
                  </div>
                </div>
                <div>
                  <div className="text-amber-600 dark:text-amber-400 font-semibold">
                    Difficult
                  </div>
                  <div className="font-mono-num text-base font-bold text-slate-900 dark:text-slate-100">
                    {metrics.difficultWords} ({difficultPct}%)
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 font-semibold">Unstudied</div>
                  <div className="font-mono-num text-base font-bold text-slate-900 dark:text-slate-100">
                    {metrics.newWords} ({newPct}%)
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Weekly Learning Activity Chart */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Weekly Learning Activity
            </h2>
            <span className="text-xs text-slate-500">Last 7 days</span>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 pt-4">
            {metrics.weeklySeries.map((day) => {
              const barPct = Math.round((day.count / metrics.maxWeeklyCount) * 100);
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400 h-4">
                    {day.count > 0 ? day.count : ''}
                  </div>
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${
                        day.count > 0
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: day.count > 0 ? `${Math.max(14, barPct)}%` : '8%' }}
                      title={`${day.dateStr}: ${day.count} learning actions`}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{day.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Part-Wise Completion Chart */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Part-wise Completion
            </h2>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          {metrics.parts.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No Parts added yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.parts.map((part) => (
                <div key={part.partNumber} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Part {part.partNumber}
                    </span>
                    <span className="font-mono-num text-slate-500 dark:text-slate-400">
                      {part.completedLessons}/{part.totalTargetLessons} lessons ({part.progressPercent}
                      %)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                      style={{ width: `${part.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Known vs Difficult Vocabulary Chart */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Known vs Difficult Vocabulary
            </h2>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>

          {metrics.knownWords + metrics.difficultWords === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Review words in Flashcards, Quiz, or Daily Revision to populate this breakdown.
            </p>
          ) : (
            <div className="space-y-4">
              {(() => {
                const studiedTotal = metrics.knownWords + metrics.difficultWords;
                const kRatio = Math.round((metrics.knownWords / studiedTotal) * 100);
                const dRatio = 100 - kRatio;
                return (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-emerald-700 dark:text-emerald-300">
                          Known Words
                        </span>
                        <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                          {metrics.knownWords} ({kRatio}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${kRatio}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          Difficult / Need Practice
                        </span>
                        <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                          {metrics.difficultWords} ({dRatio}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${dRatio}%` }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
