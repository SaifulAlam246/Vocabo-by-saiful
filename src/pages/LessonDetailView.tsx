import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronsDownUp,
  ChevronsUpDown,
  Edit3,
  Printer,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { Lesson } from '../types/vocab';
import { VocabularyCard } from '../components/VocabularyCard';
import { StorySection } from '../components/StorySection';

interface LessonDetailViewProps {
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  canManageContent?: boolean;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onEditLesson: (lessonId: string) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: string) => void;
  onToggleFavoriteWord: (lessonId: string, wordId: string) => void;
  onStartLessonRevision: (lessonId: string) => void;
  onCopy: (text: string, label: string) => void;
}

export const LessonDetailView: React.FC<LessonDetailViewProps> = ({
  lesson,
  prevLesson,
  nextLesson,
  canManageContent = true,
  onBack,
  onOpenLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleComplete,
  onToggleFavoriteWord,
  onStartLessonRevision,
  onCopy,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(lesson.words.map((w) => w.id))
  );

  // Reset expanded cards when switching lessons
  useEffect(() => {
    setExpandedIds(new Set(lesson.words.map((w) => w.id)));
  }, [lesson.id, lesson.words]);

  const allExpanded =
    lesson.words.length > 0 && lesson.words.every((w) => expandedIds.has(w.id));

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(lesson.words.map((w) => w.id)));
    }
  };

  const handleToggleWord = (wordId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lessons</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStartLessonRevision(lesson.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Revise Lesson</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {canManageContent && (
            <>
              <button
                type="button"
                onClick={() => onEditLesson(lesson.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteLesson(lesson)}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lesson Title Header Card */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 font-mono-num">
              <span>Part {lesson.partNumber}</span>
              <span aria-hidden="true">→</span>
              <span>Lesson {lesson.lessonCode}</span>
              <span aria-hidden="true">·</span>
              <span>
                Words {lesson.wordRangeStart}–{lesson.wordRangeEnd}
              </span>
              <span aria-hidden="true">·</span>
              <span>{lesson.words.length} Vocabulary Words</span>
            </div>
            <h1 className="mt-1.5 font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
              Part {lesson.partNumber} → Lesson {lesson.lessonCode}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <button
              type="button"
              onClick={handleToggleAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {allExpanded ? (
                <>
                  <ChevronsDownUp className="w-4 h-4" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-4 h-4" />
                  <span>Expand All</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onToggleComplete(lesson.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                lesson.completed
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lesson.completed ? 'Lesson Completed' : 'Mark as Completed'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Vocabulary Cards List */}
      <section aria-label="Vocabulary Words" className="space-y-3">
        {lesson.words.map((word, idx) => (
          <VocabularyCard
            key={word.id}
            word={word}
            displayIndex={lesson.wordRangeStart + idx}
            expanded={expandedIds.has(word.id)}
            onToggleExpand={() => handleToggleWord(word.id)}
            onToggleFavorite={() => onToggleFavoriteWord(lesson.id, word.id)}
            onCopy={onCopy}
          />
        ))}
      </section>

      {/* Story + Bangla Summary + Story Word Review */}
      <StorySection
        story={lesson.story}
        banglaSummary={lesson.banglaSummary}
        storyWordReview={lesson.storyWordReview}
        storyWordReviewRaw={lesson.storyWordReviewRaw}
        words={lesson.words}
        onCopy={onCopy}
      />

      {/* Previous / Next Lesson Navigation */}
      <nav
        aria-label="Lesson sequence navigation"
        className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print"
      >
        {prevLesson ? (
          <button
            type="button"
            onClick={() => onOpenLesson(prevLesson.id)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-between sm:justify-start gap-3 px-4 py-3 min-h-[48px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Previous Lesson</div>
              <div className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                Lesson {prevLesson.lessonCode}
              </div>
            </div>
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        {nextLesson && (
          <button
            type="button"
            onClick={() => onOpenLesson(nextLesson.id)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-between sm:justify-end gap-3 px-4 py-3 min-h-[48px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-right transition-colors"
          >
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Next Lesson</div>
              <div className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                Lesson {nextLesson.lessonCode}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        )}
      </nav>
    </div>
  );
};
