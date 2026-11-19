import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityStats,
  AppPage,
  AppSettings,
  Lesson,
  QuizAttemptRecord,
  RevisionSessionRecord,
  ToastMessage,
  VocabStoreData,
} from './types/vocab';
import { SAMPLE_LESSON_1_1 } from './data/sampleLesson';
import { getAdjacentLessons, groupLessonsIntoParts, sortLessons } from './utils/numbering';
import { computeNextWordReviewState, isWordDueForReview } from './utils/spacedRepetition';
import { DEFAULT_ACTIVITY, getLocalDateString, loadStore, saveStore } from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';
import { WordDetailModal, WordOccurrence } from './components/WordDetailModal';
import { DashboardView } from './pages/DashboardView';
import { PartsAndLessonsView } from './pages/PartsAndLessonsView';
import { LessonDetailView } from './pages/LessonDetailView';
import { AddEditLessonView } from './pages/AddEditLessonView';
import { VocabularyLibraryView } from './pages/VocabularyLibraryView';
import { FlashcardsView } from './pages/FlashcardsView';
import { QuizView } from './pages/QuizView';
import { DailyRevisionView } from './pages/DailyRevisionView';
import { ReadingModeView } from './pages/ReadingModeView';
import { ProgressTrackerView } from './pages/ProgressTrackerView';
import { FavoritesView } from './pages/FavoritesView';
import { SettingsView } from './pages/SettingsView';

function recordActivityDay(prev: ActivityStats, delta = 1): ActivityStats {
  const today = getLocalDateString();
  const activeDates = prev.activeDates.includes(today)
    ? prev.activeDates
    : [...prev.activeDates, today];
  return {
    ...prev,
    activeDates,
    dailyActivityCounts: {
      ...prev.dailyActivityCounts,
      [today]: (prev.dailyActivityCounts[today] ?? 0) + delta,
    },
  };
}

export default function App() {
  const [store, setStore] = useState<VocabStoreData>(() => loadStore());
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [preferredPartNumber, setPreferredPartNumber] = useState<number | undefined>(undefined);
  const [revisionFilterFavorites, setRevisionFilterFavorites] = useState<boolean>(false);
  const [readingFocusMode, setReadingFocusMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalWordOccurrences, setModalWordOccurrences] = useState<WordOccurrence[] | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState<boolean>(false);

  // Persist changes to localStorage
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (store.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [store.settings.theme]);

  const showToast = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast('success', `${label} copied to clipboard.`);
      } catch {
        showToast('error', 'Unable to copy to clipboard.');
      }
    },
    [showToast]
  );

  const navigate = useCallback((page: AppPage) => {
    setCurrentPage(page);
    if (page !== 'reading') {
      setReadingFocusMode(false);
    }
    if (page !== 'revision') {
      setRevisionFilterFavorites(false);
    }
    if (page !== 'add-lesson') {
      setPreferredPartNumber(undefined);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openLesson = useCallback((lessonId: string) => {
    setStore((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l) =>
        l.id === lessonId ? { ...l, lastStudiedAt: new Date().toISOString() } : l
      ),
    }));
    setActiveLessonId(lessonId);
    setReadingFocusMode(false);
    setCurrentPage('lesson-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleTheme = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
      },
    }));
  }, []);

  const handleUpdateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setStore((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
      showToast('success', 'Settings updated.');
    },
    [showToast]
  );

  const handleSaveLesson = useCallback(
    (lesson: Lesson, isEdit: boolean) => {
      setStore((prev) => {
        const nextLessons = isEdit
          ? prev.lessons.map((l) => (l.id === lesson.id ? lesson : l))
          : [...prev.lessons, lesson];
        return {
          ...prev,
          lessons: sortLessons(nextLessons),
        };
      });
      setActiveLessonId(lesson.id);
      setPreferredPartNumber(undefined);
      setCurrentPage('lesson-detail');
      showToast(
        'success',
        isEdit
          ? `Lesson ${lesson.lessonCode} updated successfully.`
          : `Lesson ${lesson.lessonCode} saved to Part ${lesson.partNumber}!`
      );
    },
    [showToast]
  );

  const handleConfirmDeleteLesson = useCallback(() => {
    if (!lessonToDelete) return;
    const deletedCode = lessonToDelete.lessonCode;
    const deletedId = lessonToDelete.id;

    setStore((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((l) => l.id !== deletedId),
    }));
    setLessonToDelete(null);

    if (activeLessonId === deletedId) {
      setActiveLessonId(null);
      setCurrentPage('parts-lessons');
    }
    showToast('info', `Lesson ${deletedCode} deleted.`);
  }, [lessonToDelete, activeLessonId, showToast]);

  const handleToggleLessonComplete = useCallback(
    (lessonId: string) => {
      setStore((prev) => {
        const target = prev.lessons.find((l) => l.id === lessonId);
        if (!target) return prev;
        const becomingCompleted = !target.completed;
        const now = new Date().toISOString();

        return {
          ...prev,
          lessons: prev.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  completed: becomingCompleted,
                  completedAt: becomingCompleted ? now : undefined,
                  updatedAt: now,
                }
              : l
          ),
          activity: becomingCompleted
            ? recordActivityDay(prev.activity, 1)
            : prev.activity,
        };
      });
    },
    []
  );

  const handleToggleFavoriteWord = useCallback((lessonId: string, wordId: string) => {
    setStore((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              words: l.words.map((w) =>
                w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w
              ),
            }
          : l
      ),
    }));

    setModalWordOccurrences((prev) =>
      prev
        ? prev.map((occ) =>
            occ.lesson.id === lessonId && occ.word.id === wordId
              ? { ...occ, word: { ...occ.word, isFavorite: !occ.word.isFavorite } }
              : occ
          )
        : null
    );
  }, []);

  const handleMarkWordOutcome = useCallback(
    (lessonId: string, wordId: string, outcome: 'known' | 'difficult') => {
      setStore((prev) => ({
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lessonId
            ? {
                ...l,
                words: l.words.map((w) =>
                  w.id === wordId ? computeNextWordReviewState(w, outcome) : w
                ),
              }
            : l
        ),
        activity: recordActivityDay(prev.activity, 1),
      }));
    },
    []
  );

  const handleRecordQuizResult = useCallback(
    (
      attempt: QuizAttemptRecord,
      wordOutcomes: Array<{ lessonId: string; wordId: string; correct: boolean }>
    ) => {
      const outcomeMap = new Map(
        wordOutcomes.map((o) => [`${o.lessonId}_${o.wordId}`, o.correct])
      );

      setStore((prev) => ({
        ...prev,
        lessons: prev.lessons.map((l) => ({
          ...l,
          words: l.words.map((w) => {
            const correct = outcomeMap.get(`${l.id}_${w.id}`);
            if (correct === undefined) return w;
            return computeNextWordReviewState(w, correct ? 'known' : 'difficult');
          }),
        })),
        activity: {
          ...recordActivityDay(prev.activity, 1),
          quizHistory: [attempt, ...prev.activity.quizHistory].slice(0, 50),
        },
      }));
    },
    []
  );

  const handleCompleteRevisionSession = useCallback(
    (record: RevisionSessionRecord) => {
      setStore((prev) => ({
        ...prev,
        activity: {
          ...recordActivityDay(prev.activity, 1),
          revisionHistory: [record, ...prev.activity.revisionHistory].slice(0, 50),
        },
      }));
      showToast('success', 'Daily revision session saved.');
    },
    [showToast]
  );

  const handleMarkStoryCompleted = useCallback(
    (lessonId: string) => {
      setStore((prev) => {
        const target = prev.lessons.find((l) => l.id === lessonId);
        if (!target) return prev;
        const nextCompleted = !target.storyCompleted;
        const now = new Date().toISOString();

        return {
          ...prev,
          lessons: prev.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  storyCompleted: nextCompleted,
                  storyCompletedAt: nextCompleted ? now : undefined,
                }
              : l
          ),
          activity: nextCompleted
            ? {
                ...recordActivityDay(prev.activity, 1),
                readingHistory: [
                  {
                    id: `read_${Date.now()}`,
                    date: now,
                    lessonId: target.id,
                    lessonCode: target.lessonCode,
                    completed: true,
                  },
                  ...prev.activity.readingHistory,
                ].slice(0, 50),
              }
            : prev.activity,
        };
      });
      showToast('success', 'Reading progress updated.');
    },
    [showToast]
  );

  const handleImportBackup = useCallback(
    (imported: VocabStoreData, mode: 'replace' | 'merge') => {
      setStore((prev) => {
        if (mode === 'replace') {
          return imported;
        }
        const existingIds = new Set(prev.lessons.map((l) => l.id));
        const mergedLessons = [...prev.lessons];
        for (const l of imported.lessons) {
          if (!existingIds.has(l.id)) {
            mergedLessons.push(l);
          }
        }
        const mergedActiveDates = Array.from(
          new Set([...prev.activity.activeDates, ...imported.activity.activeDates])
        );
        return {
          ...prev,
          lessons: sortLessons(mergedLessons),
          activity: {
            ...prev.activity,
            activeDates: mergedActiveDates,
            quizHistory: [...prev.activity.quizHistory, ...imported.activity.quizHistory].slice(
              0,
              50
            ),
            revisionHistory: [
              ...prev.activity.revisionHistory,
              ...imported.activity.revisionHistory,
            ].slice(0, 50),
            readingHistory: [
              ...prev.activity.readingHistory,
              ...imported.activity.readingHistory,
            ].slice(0, 50),
          },
        };
      });
      showToast(
        'success',
        mode === 'replace'
          ? 'Backup restored successfully.'
          : 'Backup lessons merged with your existing library.'
      );
    },
    [showToast]
  );

  const handleRestoreSample = useCallback(() => {
    setStore((prev) => {
      if (prev.lessons.some((l) => l.id === SAMPLE_LESSON_1_1.id)) {
        return prev;
      }
      return {
        ...prev,
        lessons: sortLessons([SAMPLE_LESSON_1_1, ...prev.lessons]),
      };
    });
    showToast('success', 'Sample Lesson 1.1 is ready in Part 1.');
  }, [showToast]);

  const handleConfirmDeleteAll = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      lessons: [],
      activity: { ...DEFAULT_ACTIVITY },
    }));
    setConfirmDeleteAllOpen(false);
    setActiveLessonId(null);
    setCurrentPage('dashboard');
    showToast('info', 'All lessons and learning progress have been cleared.');
  }, [showToast]);

  // Derived counts for sidebar badges
  const sidebarCounts = useMemo(() => {
    const parts = groupLessonsIntoParts(store.lessons, store.settings.lessonsPerPart);
    let words = 0;
    let favorites = 0;
    let dueRevision = 0;
    for (const l of store.lessons) {
      for (const w of l.words) {
        words++;
        if (w.isFavorite) favorites++;
        if (isWordDueForReview(w)) dueRevision++;
      }
    }
    return {
      parts: parts.length,
      lessons: store.lessons.length,
      words,
      favorites,
      dueRevision,
    };
  }, [store.lessons, store.settings.lessonsPerPart]);

  const activeLesson = useMemo(
    () => store.lessons.find((l) => l.id === activeLessonId) ?? null,
    [store.lessons, activeLessonId]
  );

  const adjacentLessons = useMemo(
    () =>
      activeLesson
        ? getAdjacentLessons(store.lessons, activeLesson.id)
        : { prevLesson: null, nextLesson: null },
    [store.lessons, activeLesson]
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        theme={store.settings.theme}
        onToggleTheme={handleToggleTheme}
        mobileOpen={mobileMenuOpen}
        onSetMobileOpen={setMobileMenuOpen}
        hidden={currentPage === 'reading' && readingFocusMode}
        counts={sidebarCounts}
      />

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {currentPage === 'dashboard' && (
            <DashboardView
              lessons={store.lessons}
              lessonsPerPart={store.settings.lessonsPerPart}
              onNavigate={navigate}
              onNavigateAddLesson={() => navigate('add-lesson')}
              onOpenLesson={openLesson}
              onSelectWord={(occurrences) => setModalWordOccurrences(occurrences)}
            />
          )}

          {currentPage === 'parts-lessons' && (
            <PartsAndLessonsView
              lessons={store.lessons}
              lessonsPerPart={store.settings.lessonsPerPart}
              onOpenLesson={openLesson}
              onEditLesson={(lessonId) => {
                setActiveLessonId(lessonId);
                setCurrentPage('edit-lesson');
              }}
              onDeleteLesson={(lesson) => setLessonToDelete(lesson)}
              onToggleComplete={handleToggleLessonComplete}
              onAddLesson={(partNum) => {
                setPreferredPartNumber(partNum);
                setCurrentPage('add-lesson');
              }}
            />
          )}

          {currentPage === 'lesson-detail' && activeLesson && (
            <LessonDetailView
              lesson={activeLesson}
              prevLesson={adjacentLessons.prevLesson}
              nextLesson={adjacentLessons.nextLesson}
              onBack={() => navigate('parts-lessons')}
              onOpenLesson={openLesson}
              onEditLesson={(lessonId) => {
                setActiveLessonId(lessonId);
                setCurrentPage('edit-lesson');
              }}
              onDeleteLesson={(lesson) => setLessonToDelete(lesson)}
              onToggleComplete={handleToggleLessonComplete}
              onToggleFavoriteWord={handleToggleFavoriteWord}
              onStartLessonRevision={() => navigate('revision')}
              onCopy={handleCopy}
            />
          )}

          {currentPage === 'add-lesson' && (
            <AddEditLessonView
              mode="add"
              existingLessons={store.lessons}
              preferredPartNumber={preferredPartNumber}
              lessonsPerPart={store.settings.lessonsPerPart}
              wordsPerLesson={store.settings.wordsPerLesson}
              onSaveLesson={handleSaveLesson}
              onCancel={() => navigate('parts-lessons')}
            />
          )}

          {currentPage === 'edit-lesson' && activeLesson && (
            <AddEditLessonView
              mode="edit"
              existingLessons={store.lessons}
              editingLesson={activeLesson}
              lessonsPerPart={store.settings.lessonsPerPart}
              wordsPerLesson={store.settings.wordsPerLesson}
              onSaveLesson={handleSaveLesson}
              onCancel={() => openLesson(activeLesson.id)}
            />
          )}

          {currentPage === 'library' && (
            <VocabularyLibraryView
              lessons={store.lessons}
              onSelectWordOccurrences={(occurrences) => setModalWordOccurrences(occurrences)}
              onToggleFavoriteWord={handleToggleFavoriteWord}
              onCopy={handleCopy}
            />
          )}

          {currentPage === 'flashcards' && (
            <FlashcardsView
              lessons={store.lessons}
              onMarkWord={handleMarkWordOutcome}
              onToggleFavorite={handleToggleFavoriteWord}
              onNavigateAddLesson={() => navigate('add-lesson')}
            />
          )}

          {currentPage === 'quiz' && (
            <QuizView
              lessons={store.lessons}
              quizHistory={store.activity.quizHistory}
              onRecordQuizResult={handleRecordQuizResult}
              onNavigateAddLesson={() => navigate('add-lesson')}
            />
          )}

          {currentPage === 'revision' && (
            <DailyRevisionView
              lessons={store.lessons}
              dailyTarget={store.activity.dailyRevisionTarget}
              revisionHistory={store.activity.revisionHistory}
              initialFilterFavorites={revisionFilterFavorites}
              onChangeDailyTarget={(target) =>
                setStore((prev) => ({
                  ...prev,
                  activity: { ...prev.activity, dailyRevisionTarget: target },
                }))
              }
              onMarkWord={handleMarkWordOutcome}
              onCompleteRevisionSession={handleCompleteRevisionSession}
              onNavigateAddLesson={() => navigate('add-lesson')}
            />
          )}

          {currentPage === 'reading' && (
            <ReadingModeView
              lessons={store.lessons}
              initialLessonId={activeLessonId ?? undefined}
              focusMode={readingFocusMode}
              onToggleFocusMode={setReadingFocusMode}
              onMarkStoryCompleted={handleMarkStoryCompleted}
              onNavigateAddLesson={() => navigate('add-lesson')}
            />
          )}

          {currentPage === 'progress' && (
            <ProgressTrackerView
              lessons={store.lessons}
              lessonsPerPart={store.settings.lessonsPerPart}
              activity={store.activity}
            />
          )}

          {currentPage === 'favorites' && (
            <FavoritesView
              lessons={store.lessons}
              onToggleFavoriteWord={handleToggleFavoriteWord}
              onOpenLesson={openLesson}
              onReviseFavorites={() => {
                setRevisionFilterFavorites(true);
                setCurrentPage('revision');
              }}
              onCopy={handleCopy}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsView
              storeData={store}
              onUpdateSettings={handleUpdateSettings}
              onImportBackup={handleImportBackup}
              onRestoreSample={handleRestoreSample}
              onRequestDeleteAll={() => setConfirmDeleteAllOpen(true)}
              onShowToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Modals & Toasts */}
      {modalWordOccurrences && (
        <WordDetailModal
          occurrences={modalWordOccurrences}
          onClose={() => setModalWordOccurrences(null)}
          onToggleFavorite={handleToggleFavoriteWord}
          onOpenLesson={openLesson}
          onCopy={handleCopy}
        />
      )}

      <ConfirmModal
        open={Boolean(lessonToDelete)}
        title={`Delete Lesson ${lessonToDelete?.lessonCode ?? ''}?`}
        description={`This will permanently remove Lesson ${lessonToDelete?.lessonCode ?? ''} and its ${
          lessonToDelete?.words.length ?? 0
        } vocabulary words from Part ${lessonToDelete?.partNumber ?? ''}. Other lessons in this Part will remain untouched.`}
        confirmLabel="Delete Lesson"
        destructive
        onConfirm={handleConfirmDeleteLesson}
        onCancel={() => setLessonToDelete(null)}
      />

      <ConfirmModal
        open={confirmDeleteAllOpen}
        title="Delete All Vocabo Data?"
        description="This will permanently erase all saved lessons, vocabulary words, favorites, quiz history, and revision progress from this browser. Export a JSON backup first if you want to keep a copy."
        confirmLabel="Delete Everything"
        destructive
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setConfirmDeleteAllOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
