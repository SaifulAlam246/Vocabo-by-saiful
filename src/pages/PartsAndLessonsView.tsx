import React, { useMemo, useState } from 'react';
import { FolderKanban, Layers, PlusCircle, Search } from 'lucide-react';
import { Lesson, PartRecord } from '../types/vocab';
import { groupLessonsIntoParts, sortLessons } from '../utils/numbering';
import { PartCard } from '../components/PartCard';
import { LessonCard } from '../components/LessonCard';

interface PartsAndLessonsViewProps {
  lessons: Lesson[];
  partRecords?: PartRecord[];
  lessonsPerPart: number;
  canManageContent?: boolean;
  onOpenLesson: (lessonId: string) => void;
  onEditLesson: (lessonId: string) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: string) => void;
  onAddLesson: (preferredPartNumber?: number) => void;
}

export const PartsAndLessonsView: React.FC<PartsAndLessonsViewProps> = ({
  lessons,
  partRecords = [],
  lessonsPerPart,
  canManageContent = true,
  onOpenLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleComplete,
  onAddLesson,
}) => {
  const [viewMode, setViewMode] = useState<'parts' | 'lessons'>('parts');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [query, setQuery] = useState('');

  const parts = useMemo(
    () => groupLessonsIntoParts(lessons, lessonsPerPart, partRecords),
    [lessons, lessonsPerPart, partRecords]
  );

  const partNumbers = useMemo(() => {
    return Array.from(new Set(lessons.map((l) => l.partNumber))).sort((a, b) => a - b);
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const sorted = sortLessons(lessons);
    const q = query.trim().toLowerCase();

    return sorted.filter((lesson) => {
      if (selectedPart !== 'all' && lesson.partNumber !== Number(selectedPart)) return false;
      if (statusFilter === 'completed' && !lesson.completed) return false;
      if (statusFilter === 'incomplete' && lesson.completed) return false;
      if (q) {
        const matchCode = lesson.lessonCode.toLowerCase().includes(q);
        const matchWord = lesson.words.some(
          (w) =>
            w.word.toLowerCase().includes(q) || w.banglaMeaning.toLowerCase().includes(q)
        );
        if (!matchCode && !matchWord) return false;
      }
      return true;
    });
  }, [lessons, selectedPart, statusFilter, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            Parts &amp; Lessons
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Each Part contains {lessonsPerPart} lessons ({lessonsPerPart * 10} words). Study, edit,
            or reassign lessons cleanly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('parts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'parts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Part</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lessons')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'lessons'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>All Lessons</span>
            </button>
          </div>

          {canManageContent && (
            <button
              type="button"
              onClick={() => onAddLesson()}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Lesson</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'parts' ? (
        parts.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
            <Layers className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
              No Parts Created Yet
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {canManageContent
                ? 'Add your first lesson to automatically create Part 1 and Lesson 1.1.'
                : 'No vocabulary lessons have been published yet. Please check back shortly.'}
            </p>
            {canManageContent && (
              <button
                type="button"
                onClick={() => onAddLesson(1)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Lesson 1.1</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {parts.map((part) => (
              <PartCard
                key={part.partNumber}
                part={part}
                canManageContent={canManageContent}
                onOpenLesson={onOpenLesson}
                onAddLessonToPart={(partNum) => onAddLesson(partNum)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by lesson number (e.g. 1.1) or word..."
                className="w-full pl-10 pr-4 py-2 min-h-[40px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                aria-label="Filter by Part"
                className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Parts</option>
                {partNumbers.map((num) => (
                  <option key={num} value={String(num)}>
                    Part {num}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['all', 'incomplete', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'incomplete' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
              <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
                No Lessons Found
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {lessons.length === 0
                  ? 'Add your first vocabulary lesson to get started.'
                  : 'Try clearing your search or status filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  canManageContent={canManageContent}
                  onOpen={() => onOpenLesson(lesson.id)}
                  onEdit={() => onEditLesson(lesson.id)}
                  onDelete={() => onDeleteLesson(lesson)}
                  onToggleComplete={() => onToggleComplete(lesson.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
