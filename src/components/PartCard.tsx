import React from 'react';
import { ArrowRight, CheckCircle2, Layers } from 'lucide-react';
import { Lesson, PartSummary } from '../types/vocab';

interface PartCardProps {
  part: PartSummary;
  onOpenLesson: (lessonId: string) => void;
  onAddLessonToPart: (partNumber: number) => void;
}

export const PartCard: React.FC<PartCardProps> = ({
  part,
  onOpenLesson,
  onAddLessonToPart,
}) => {
  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
              Part {part.partNumber}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono-num">
                {part.lessons.length} / {part.totalTargetLessons} Lessons
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{part.totalWords} Words</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{part.completedLessons} Completed</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono-num text-sm font-semibold text-slate-700 dark:text-slate-200">
            {part.progressPercent}%
          </span>
          <button
            type="button"
            onClick={() => onAddLessonToPart(part.partNumber)}
            className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            + Add to Part {part.partNumber}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
          style={{ width: `${Math.min(100, part.progressPercent)}%` }}
        />
      </div>

      {/* Lesson List Inside Part */}
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {part.lessons.map((lesson: Lesson) => (
          <button
            key={lesson.id}
            type="button"
            onClick={() => onOpenLesson(lesson.id)}
            className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Lesson {lesson.lessonCode}
                </span>
                <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                  Words {lesson.wordRangeStart}–{lesson.wordRangeEnd}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                  {lesson.words.length} words
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                {lesson.words.map((w) => w.word).join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {lesson.completed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Completed</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">In Progress</span>
              )}
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
