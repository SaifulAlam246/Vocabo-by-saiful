import React from 'react';
import { ArrowRight, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { Lesson } from '../types/vocab';

interface LessonCardProps {
  lesson: Lesson;
  canManageContent?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  canManageContent = true,
  onOpen,
  onEdit,
  onDelete,
  onToggleComplete,
}) => {
  return (
    <article className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="text-left group focus-visible:outline-none"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono-num">
              Part {lesson.partNumber} · Words {lesson.wordRangeStart}–{lesson.wordRangeEnd}
            </div>
            <h3 className="mt-1 font-display font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Lesson {lesson.lessonCode}
            </h3>
          </button>

          <button
            type="button"
            onClick={onToggleComplete}
            title={lesson.completed ? 'Mark as incomplete' : 'Mark as completed'}
            className={`inline-flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-md transition-colors shrink-0 ${
              lesson.completed
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{lesson.completed ? 'Completed' : 'Mark Done'}</span>
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {lesson.words.map((w) => w.word).join(', ') || 'No words added yet'}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
          {lesson.words.length} {lesson.words.length === 1 ? 'word' : 'words'}
        </span>

        <div className="flex items-center gap-1">
          {canManageContent && (
            <>
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit Lesson ${lesson.lessonCode}`}
                title="Edit lesson"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete Lesson ${lesson.lessonCode}`}
                title="Delete lesson"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap"
          >
            <span>Study</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
