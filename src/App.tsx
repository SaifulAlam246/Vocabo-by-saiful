import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  ActivityStats,
  AdminAuthState,
  AppPage,
  AppSettings,
  Lesson,
  MigrationConflictMode,
  MigrationReport,
  PartRecord,
  QuizAttemptRecord,
  RevisionSessionRecord,
  SupabaseSetupStatus,
  ToastMessage,
  VocabStoreData,
  VocabWord,
} from './types/vocab';
import { SAMPLE_LESSON_1_1 } from './data/sampleLesson';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './lib/supabaseClient';
import {
  deleteLessonInSupabase,
  deletePartInSupabase,
  deleteWordInSupabase,
  fetchSharedCurriculumFromSupabase,
  formatSupabaseError,
  isMissingTableError,
  migrateLocalLessonsToSupabase,
  saveLessonToSupabase,
  saveStoryAndReviewInSupabase,
  signInAdmin,
  signOutAdmin,
  upsertPartInSupabase,
  upsertWordInSupabase,
  verifyAdminSession,
  verifySupabaseDatabaseSetup,
} from './services/supabaseVocabService';
import { getAdjacentLessons, groupLessonsIntoParts, sortLessons } from './utils/numbering';
import { computeNextWordReviewState, isWordDueForReview } from './utils/spacedRepetition';
import { DEFAULT_ACTIVITY, getLocalDateString, loadStore, saveStore } from './utils/storage';
import {
  applyPersonalProgressToLessons,
  clearPersonalProgress,
  getLessonProgressKeys,
  getWordProgressKeys,
  loadCachedSupabaseCurriculum,
  loadPersonalProgress,
  PersonalProgressStore,
  saveCachedSupabaseCurriculum,
  savePersonalProgress,
} from './utils/personalProgress';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { WordDetailModal, WordOccurrence } from './components/WordDetailModal';
import { DashboardView } from './pages/DashboardView';
import { PartsAndLessonsView } from './pages/PartsAndLessonsView';
import { LessonDetailView } from './pages/LessonDetailView';
import { AddEditLessonView } from './pages/AddEditLessonView';
import { AdminDashboardView } from './pages/AdminDashboardView';
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
  // Local fallback store (used only when Supabase env vars are not configured)
  const [localStore, setLocalStore] = useState<VocabStoreData>(() => loadStore());

  // Personal per-device progress store (used when Supabase is active so visitors never share personal state)
  const [personalProgress, setPersonalProgress] = useState<PersonalProgressStore>(() =>
    loadPersonalProgress()
  );

  // Shared Supabase curriculum state
  const initialCache = useMemo(
    () => (isSupabaseConfigured ? loadCachedSupabaseCurriculum() : null),
    []
  );
  const [sharedParts, setSharedParts] = useState<PartRecord[]>(() => initialCache?.parts ?? []);
  const [sharedLessons, setSharedLessons] = useState<Lesson[]>(
    () => initialCache?.lessons ?? []
  );
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(isSupabaseConfigured);
  const [supabaseSyncing, setSupabaseSyncing] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [supabaseSetupStatus, setSupabaseSetupStatus] = useState<SupabaseSetupStatus | null>(null);

  // Admin auth state (always verified against public.admin_users in Supabase)
  const [adminAuth, setAdminAuth] = useState<AdminAuthState>({
    configured: isSupabaseConfigured,
    loading: isSupabaseConfigured,
    userId: null,
    email: null,
    isAdmin: false,
    error: null,
  });
  const [adminLoginOpen, setAdminLoginOpen] = useState<boolean>(false);

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
  const [savingLesson, setSavingLesson] = useState<boolean>(false);

  const canManageContent = isSupabaseConfigured ? adminAuth.isAdmin : true;

  // Effective lessons, settings, and activity depending on mode
  const effectiveSettings: AppSettings = isSupabaseConfigured
    ? personalProgress.settings
    : localStore.settings;

  const effectiveActivity: ActivityStats = isSupabaseConfigured
    ? personalProgress.activity
    : localStore.activity;

  const effectiveLessons: Lesson[] = useMemo(() => {
    if (!isSupabaseConfigured) return localStore.lessons;
    return applyPersonalProgressToLessons(sharedLessons, personalProgress);
  }, [localStore.lessons, sharedLessons, personalProgress]);

  const effectiveStoreForBackup: VocabStoreData = useMemo(
    () => ({
      version: 2,
      lessons: effectiveLessons,
      settings: effectiveSettings,
      activity: effectiveActivity,
    }),
    [effectiveLessons, effectiveSettings, effectiveActivity]
  );

  // Persist local store ONLY in non-Supabase mode so legacy localStorage is never overwritten when Supabase is active
  useEffect(() => {
    if (!isSupabaseConfigured) {
      saveStore(localStore);
    }
  }, [localStore]);

  // Persist personal progress separately
  useEffect(() => {
    if (isSupabaseConfigured) {
      savePersonalProgress(personalProgress);
    }
  }, [personalProgress]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveSettings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effectiveSettings.theme]);

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

  const verifyDatabaseSetup = useCallback(
    async (silent = false): Promise<SupabaseSetupStatus | null> => {
      if (!isSupabaseConfigured) return null;
      try {
        const status = await verifySupabaseDatabaseSetup();
        setSupabaseSetupStatus(status);
        if (!silent) {
          showToast(
            status.allTablesReady ? 'success' : 'warning',
            status.summary
          );
        }
        return status;
      } catch (err) {
        const msg = formatSupabaseError(err);
        if (!silent) showToast('error', `Database verification failed: ${msg}`);
        return null;
      }
    },
    [showToast]
  );

  const refreshFromSupabase = useCallback(
    async (silent = false) => {
      if (!isSupabaseConfigured) return;
      setSupabaseSyncing(true);
      setSupabaseError(null);
      try {
        const [{ parts, lessons }, status] = await Promise.all([
          fetchSharedCurriculumFromSupabase(),
          verifySupabaseDatabaseSetup(),
        ]);
        setSharedParts(parts);
        setSharedLessons(lessons);
        setSupabaseSetupStatus(status);
        saveCachedSupabaseCurriculum(parts, lessons);
      } catch (err) {
        if (isMissingTableError(err)) {
          const status = await verifySupabaseDatabaseSetup().catch(() => null);
          if (status) setSupabaseSetupStatus(status);
          const missingMsg =
            'Database tables have not been created in Supabase yet. Run supabase/migrations/001_vocabo_schema.sql in Supabase SQL Editor, then click Retry Sync.';
          setSupabaseError(missingMsg);
          if (!silent) {
            showToast('warning', missingMsg);
          }
        } else {
          const msg = formatSupabaseError(err);
          setSupabaseError(msg);
          if (!silent) {
            showToast('error', `Sync failed: ${msg}`);
          }
        }
      } finally {
        setSupabaseLoading(false);
        setSupabaseSyncing(false);
      }
    },
    [showToast]
  );

  // Initial Supabase load & Auth listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let mounted = true;
    void refreshFromSupabase(true);

    void verifyAdminSession().then((auth) => {
      if (mounted) setAdminAuth(auth);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void verifyAdminSession().then((auth) => {
        if (mounted) setAdminAuth(auth);
      });
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [refreshFromSupabase]);

  // Guard Admin-only pages if user logs out or is not an Admin
  useEffect(() => {
    if (
      isSupabaseConfigured &&
      !adminAuth.loading &&
      !adminAuth.isAdmin &&
      (currentPage === 'admin' || currentPage === 'add-lesson' || currentPage === 'edit-lesson')
    ) {
      setCurrentPage('dashboard');
    }
  }, [adminAuth.loading, adminAuth.isAdmin, currentPage]);

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

  const navigate = useCallback(
    (page: AppPage) => {
      if (
        isSupabaseConfigured &&
        !adminAuth.isAdmin &&
        (page === 'admin' || page === 'add-lesson' || page === 'edit-lesson')
      ) {
        setAdminLoginOpen(true);
        return;
      }
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
    },
    [adminAuth.isAdmin]
  );

  const openLesson = useCallback(
    (lessonId: string) => {
      const now = new Date().toISOString();
      if (isSupabaseConfigured) {
        const target = sharedLessons.find((l) => l.id === lessonId);
        if (target) {
          setPersonalProgress((prev) => {
            const nextMap = { ...prev.lessonProgressByKey };
            for (const key of getLessonProgressKeys(target)) {
              const existing = nextMap[key] ?? { completed: false };
              nextMap[key] = { ...existing, lastStudiedAt: now };
            }
            return { ...prev, lessonProgressByKey: nextMap };
          });
        }
      } else {
        setLocalStore((prev) => ({
          ...prev,
          lessons: prev.lessons.map((l) =>
            l.id === lessonId ? { ...l, lastStudiedAt: now } : l
          ),
        }));
      }
      setActiveLessonId(lessonId);
      setReadingFocusMode(false);
      setCurrentPage('lesson-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [sharedLessons]
  );

  const handleToggleTheme = useCallback(() => {
    if (isSupabaseConfigured) {
      setPersonalProgress((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
        },
      }));
    } else {
      setLocalStore((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
        },
      }));
    }
  }, []);

  const handleUpdateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      if (isSupabaseConfigured) {
        setPersonalProgress((prev) => ({
          ...prev,
          settings: { ...prev.settings, ...patch },
        }));
      } else {
        setLocalStore((prev) => ({
          ...prev,
          settings: { ...prev.settings, ...patch },
        }));
      }
      showToast('success', 'Settings updated.');
    },
    [showToast]
  );

  const handleAdminLogin = useCallback(
    async (email: string, password: string) => {
      const nextAuth = await signInAdmin(email, password);
      setAdminAuth(nextAuth);
      await refreshFromSupabase(true);
      setCurrentPage('admin');
      showToast('success', `Signed in as Admin (${nextAuth.email}).`);
    },
    [refreshFromSupabase, showToast]
  );

  const handleAdminSignOut = useCallback(async () => {
    try {
      await signOutAdmin();
      setAdminAuth({
        configured: isSupabaseConfigured,
        loading: false,
        userId: null,
        email: null,
        isAdmin: false,
        error: null,
      });
      if (
        currentPage === 'admin' ||
        currentPage === 'add-lesson' ||
        currentPage === 'edit-lesson'
      ) {
        setCurrentPage('dashboard');
      }
      showToast('info', 'Signed out from Admin session.');
    } catch (err) {
      showToast('error', formatSupabaseError(err));
    }
  }, [currentPage, showToast]);

  const handleSaveLesson = useCallback(
    async (lesson: Lesson, isEdit: boolean) => {
      if (savingLesson) return;

      if (isSupabaseConfigured) {
        if (!adminAuth.isAdmin) {
          showToast('error', 'Admin login required to save lessons.');
          setAdminLoginOpen(true);
          return;
        }
        setSavingLesson(true);
        try {
          const saved = await saveLessonToSupabase(lesson, isEdit);
          await refreshFromSupabase(true);
          setActiveLessonId(saved.id);
          setPreferredPartNumber(undefined);
          setCurrentPage('lesson-detail');
          showToast(
            'success',
            isEdit
              ? `Lesson ${saved.lessonCode} updated in Supabase.`
              : `Lesson ${saved.lessonCode} published to Part ${saved.partNumber}!`
          );
        } catch (err) {
          showToast('error', `Failed to save lesson: ${formatSupabaseError(err)}`);
        } finally {
          setSavingLesson(false);
        }
        return;
      }

      // Local-only mode fallback
      setLocalStore((prev) => {
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
    [adminAuth.isAdmin, refreshFromSupabase, savingLesson, showToast]
  );

  const handleConfirmDeleteLesson = useCallback(async () => {
    if (!lessonToDelete) return;
    const deletedCode = lessonToDelete.lessonCode;
    const deletedId = lessonToDelete.id;

    if (isSupabaseConfigured) {
      if (!adminAuth.isAdmin) {
        showToast('error', 'Admin login required.');
        return;
      }
      try {
        await deleteLessonInSupabase(deletedId);
        await refreshFromSupabase(true);
        setLessonToDelete(null);
        if (activeLessonId === deletedId) {
          setActiveLessonId(null);
          setCurrentPage('parts-lessons');
        }
        showToast('info', `Lesson ${deletedCode} deleted from Supabase.`);
      } catch (err) {
        showToast('error', `Delete failed: ${formatSupabaseError(err)}`);
      }
      return;
    }

    setLocalStore((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((l) => l.id !== deletedId),
    }));
    setLessonToDelete(null);

    if (activeLessonId === deletedId) {
      setActiveLessonId(null);
      setCurrentPage('parts-lessons');
    }
    showToast('info', `Lesson ${deletedCode} deleted.`);
  }, [activeLessonId, adminAuth.isAdmin, lessonToDelete, refreshFromSupabase, showToast]);

  // Personal learning handlers (always stay private on the visitor's browser)
  const handleToggleLessonComplete = useCallback(
    (lessonId: string) => {
      const target = effectiveLessons.find((l) => l.id === lessonId);
      if (!target) return;
      const becomingCompleted = !target.completed;
      const now = new Date().toISOString();

      if (isSupabaseConfigured) {
        setPersonalProgress((prev) => {
          const nextMap = { ...prev.lessonProgressByKey };
          for (const key of getLessonProgressKeys(target)) {
            const existing = nextMap[key] ?? { completed: false };
            nextMap[key] = {
              ...existing,
              completed: becomingCompleted,
              completedAt: becomingCompleted ? now : undefined,
            };
          }
          return {
            ...prev,
            lessonProgressByKey: nextMap,
            activity: becomingCompleted ? recordActivityDay(prev.activity, 1) : prev.activity,
          };
        });
        return;
      }

      setLocalStore((prev) => ({
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
        activity: becomingCompleted ? recordActivityDay(prev.activity, 1) : prev.activity,
      }));
    },
    [effectiveLessons]
  );

  const handleToggleFavoriteWord = useCallback(
    (lessonId: string, wordId: string) => {
      const targetLesson = effectiveLessons.find((l) => l.id === lessonId);
      const targetWord = targetLesson?.words.find((w) => w.id === wordId);

      if (isSupabaseConfigured) {
        if (targetLesson && targetWord) {
          const nextFav = !targetWord.isFavorite;
          setPersonalProgress((prev) => {
            const nextMap = { ...prev.wordProgressByKey };
            for (const key of getWordProgressKeys(targetLesson, targetWord)) {
              const existing = nextMap[key] ?? {
                isFavorite: false,
                revisionStatus: targetWord.revisionStatus,
                reviewCount: targetWord.reviewCount,
                correctCount: targetWord.correctCount,
                incorrectCount: targetWord.incorrectCount,
                difficultCount: targetWord.difficultCount,
              };
              nextMap[key] = { ...existing, isFavorite: nextFav };
            }
            return { ...prev, wordProgressByKey: nextMap };
          });
        }
      } else {
        setLocalStore((prev) => ({
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
      }

      setModalWordOccurrences((prev) =>
        prev
          ? prev.map((occ) =>
              occ.lesson.id === lessonId && occ.word.id === wordId
                ? { ...occ, word: { ...occ.word, isFavorite: !occ.word.isFavorite } }
                : occ
            )
          : null
      );
    },
    [effectiveLessons]
  );

  const handleMarkWordOutcome = useCallback(
    (lessonId: string, wordId: string, outcome: 'known' | 'difficult') => {
      if (isSupabaseConfigured) {
        const targetLesson = effectiveLessons.find((l) => l.id === lessonId);
        const targetWord = targetLesson?.words.find((w) => w.id === wordId);
        if (!targetLesson || !targetWord) return;
        const updatedWord = computeNextWordReviewState(targetWord, outcome);

        setPersonalProgress((prev) => {
          const nextMap = { ...prev.wordProgressByKey };
          for (const key of getWordProgressKeys(targetLesson, updatedWord)) {
            nextMap[key] = {
              isFavorite: updatedWord.isFavorite,
              revisionStatus: updatedWord.revisionStatus,
              reviewCount: updatedWord.reviewCount,
              correctCount: updatedWord.correctCount,
              incorrectCount: updatedWord.incorrectCount,
              difficultCount: updatedWord.difficultCount,
              easeIntervalDays: updatedWord.easeIntervalDays,
              lastReviewedAt: updatedWord.lastReviewedAt,
              nextReviewAt: updatedWord.nextReviewAt,
            };
          }
          return {
            ...prev,
            wordProgressByKey: nextMap,
            activity: recordActivityDay(prev.activity, 1),
          };
        });
        return;
      }

      setLocalStore((prev) => ({
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
    [effectiveLessons]
  );

  const handleRecordQuizResult = useCallback(
    (
      attempt: QuizAttemptRecord,
      wordOutcomes: Array<{ lessonId: string; wordId: string; correct: boolean }>
    ) => {
      const outcomeMap = new Map(
        wordOutcomes.map((o) => [`${o.lessonId}_${o.wordId}`, o.correct])
      );

      if (isSupabaseConfigured) {
        setPersonalProgress((prev) => {
          const nextMap = { ...prev.wordProgressByKey };
          for (const l of effectiveLessons) {
            for (const w of l.words) {
              const correct = outcomeMap.get(`${l.id}_${w.id}`);
              if (correct === undefined) continue;
              const updatedWord = computeNextWordReviewState(
                w,
                correct ? 'known' : 'difficult'
              );
              for (const key of getWordProgressKeys(l, updatedWord)) {
                nextMap[key] = {
                  isFavorite: updatedWord.isFavorite,
                  revisionStatus: updatedWord.revisionStatus,
                  reviewCount: updatedWord.reviewCount,
                  correctCount: updatedWord.correctCount,
                  incorrectCount: updatedWord.incorrectCount,
                  difficultCount: updatedWord.difficultCount,
                  easeIntervalDays: updatedWord.easeIntervalDays,
                  lastReviewedAt: updatedWord.lastReviewedAt,
                  nextReviewAt: updatedWord.nextReviewAt,
                };
              }
            }
          }
          return {
            ...prev,
            wordProgressByKey: nextMap,
            activity: {
              ...recordActivityDay(prev.activity, 1),
              quizHistory: [attempt, ...prev.activity.quizHistory].slice(0, 50),
            },
          };
        });
        return;
      }

      setLocalStore((prev) => ({
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
    [effectiveLessons]
  );

  const handleCompleteRevisionSession = useCallback(
    (record: RevisionSessionRecord) => {
      if (isSupabaseConfigured) {
        setPersonalProgress((prev) => ({
          ...prev,
          activity: {
            ...recordActivityDay(prev.activity, 1),
            revisionHistory: [record, ...prev.activity.revisionHistory].slice(0, 50),
          },
        }));
      } else {
        setLocalStore((prev) => ({
          ...prev,
          activity: {
            ...recordActivityDay(prev.activity, 1),
            revisionHistory: [record, ...prev.activity.revisionHistory].slice(0, 50),
          },
        }));
      }
      showToast('success', 'Daily revision session saved.');
    },
    [showToast]
  );

  const handleMarkStoryCompleted = useCallback(
    (lessonId: string) => {
      const target = effectiveLessons.find((l) => l.id === lessonId);
      if (!target) return;
      const nextCompleted = !target.storyCompleted;
      const now = new Date().toISOString();

      if (isSupabaseConfigured) {
        setPersonalProgress((prev) => {
          const nextMap = { ...prev.lessonProgressByKey };
          for (const key of getLessonProgressKeys(target)) {
            const existing = nextMap[key] ?? { completed: false };
            nextMap[key] = {
              ...existing,
              storyCompleted: nextCompleted,
              storyCompletedAt: nextCompleted ? now : undefined,
            };
          }
          return {
            ...prev,
            lessonProgressByKey: nextMap,
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
        return;
      }

      setLocalStore((prev) => ({
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
      }));
      showToast('success', 'Reading progress updated.');
    },
    [effectiveLessons, showToast]
  );

  const handleImportBackup = useCallback(
    (imported: VocabStoreData, mode: 'replace' | 'merge') => {
      setLocalStore((prev) => {
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
    setLocalStore((prev) => {
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
    if (isSupabaseConfigured) {
      setPersonalProgress(clearPersonalProgress());
      setConfirmDeleteAllOpen(false);
      showToast('info', 'Personal progress on this browser has been reset.');
      return;
    }

    setLocalStore((prev) => ({
      ...prev,
      lessons: [],
      activity: { ...DEFAULT_ACTIVITY },
    }));
    setConfirmDeleteAllOpen(false);
    setActiveLessonId(null);
    setCurrentPage('dashboard');
    showToast('info', 'All lessons and learning progress have been cleared.');
  }, [showToast]);

  // Admin Dashboard CRUD callbacks
  const handleAdminSavePart = useCallback(
    async (input: { id?: string; partNumber: number; title: string; description: string }) => {
      try {
        await upsertPartInSupabase(input);
        await refreshFromSupabase(true);
        showToast('success', `Part ${input.partNumber} saved to Supabase.`);
      } catch (err) {
        showToast('error', `Failed saving Part: ${formatSupabaseError(err)}`);
        throw err;
      }
    },
    [refreshFromSupabase, showToast]
  );

  const handleAdminDeletePart = useCallback(
    async (partId: string) => {
      try {
        await deletePartInSupabase(partId);
        await refreshFromSupabase(true);
        showToast('info', 'Part deleted from Supabase.');
      } catch (err) {
        showToast('error', `Failed deleting Part: ${formatSupabaseError(err)}`);
        throw err;
      }
    },
    [refreshFromSupabase, showToast]
  );

  const handleAdminSaveWord = useCallback(
    async (lessonId: string, word: VocabWord, wordOrder: number, isNew: boolean) => {
      try {
        await upsertWordInSupabase(lessonId, word, wordOrder, isNew);
        await refreshFromSupabase(true);
        showToast('success', `Word "${word.word}" saved to Supabase.`);
      } catch (err) {
        showToast('error', `Failed saving word: ${formatSupabaseError(err)}`);
        throw err;
      }
    },
    [refreshFromSupabase, showToast]
  );

  const handleAdminDeleteWord = useCallback(
    async (lessonId: string, wordId: string) => {
      try {
        await deleteWordInSupabase(lessonId, wordId);
        await refreshFromSupabase(true);
        showToast('info', 'Word removed from Supabase.');
      } catch (err) {
        showToast('error', `Failed deleting word: ${formatSupabaseError(err)}`);
        throw err;
      }
    },
    [refreshFromSupabase, showToast]
  );

  const handleAdminSaveStoryAndReview = useCallback(
    async (
      lessonId: string,
      payload: { story: string; banglaSummary: string; storyWordReviewRaw: string }
    ) => {
      try {
        await saveStoryAndReviewInSupabase(lessonId, {
          ...payload,
          storyWordReview: [],
        });
        await refreshFromSupabase(true);
        showToast('success', 'Story & Word Review updated in Supabase.');
      } catch (err) {
        showToast('error', `Failed updating story: ${formatSupabaseError(err)}`);
        throw err;
      }
    },
    [refreshFromSupabase, showToast]
  );

  const handleAdminRunMigration = useCallback(
    async (
      sourceLessons: Lesson[],
      conflictMode: MigrationConflictMode,
      onProgress: (p: { current: number; total: number; lessonCode: string }) => void
    ): Promise<MigrationReport> => {
      try {
        const report = await migrateLocalLessonsToSupabase(
          sourceLessons,
          conflictMode,
          onProgress
        );
        await refreshFromSupabase(true);
        if (report.failedLessons === 0) {
          showToast(
            'success',
            `Migration complete: ${report.migratedLessons} inserted, ${report.skippedLessons} skipped.`
          );
        } else {
          showToast(
            'warning',
            `Migration finished with ${report.failedLessons} failed lesson(s). Review report.`
          );
        }
        return report;
      } catch (err) {
        showToast('error', `Migration error: ${formatSupabaseError(err)}`);
        throw err;
      }
    },
    [refreshFromSupabase, showToast]
  );

  // Derived counts for sidebar badges
  const sidebarCounts = useMemo(() => {
    const parts = groupLessonsIntoParts(
      effectiveLessons,
      effectiveSettings.lessonsPerPart,
      isSupabaseConfigured ? sharedParts : []
    );
    let words = 0;
    let favorites = 0;
    let dueRevision = 0;
    for (const l of effectiveLessons) {
      for (const w of l.words) {
        words++;
        if (w.isFavorite) favorites++;
        if (isWordDueForReview(w)) dueRevision++;
      }
    }
    return {
      parts: parts.length,
      lessons: effectiveLessons.length,
      words,
      favorites,
      dueRevision,
    };
  }, [effectiveLessons, effectiveSettings.lessonsPerPart, sharedParts]);

  const activeLesson = useMemo(
    () => effectiveLessons.find((l) => l.id === activeLessonId) ?? null,
    [effectiveLessons, activeLessonId]
  );

  const adjacentLessons = useMemo(
    () =>
      activeLesson
        ? getAdjacentLessons(effectiveLessons, activeLesson.id)
        : { prevLesson: null, nextLesson: null },
    [effectiveLessons, activeLesson]
  );

  const emptyActionFallback = () =>
    navigate(canManageContent ? 'add-lesson' : 'parts-lessons');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        theme={effectiveSettings.theme}
        onToggleTheme={handleToggleTheme}
        mobileOpen={mobileMenuOpen}
        onSetMobileOpen={setMobileMenuOpen}
        hidden={currentPage === 'reading' && readingFocusMode}
        canManageContent={canManageContent}
        isAdmin={adminAuth.isAdmin}
        adminEmail={adminAuth.email}
        onOpenAdminLogin={() => setAdminLoginOpen(true)}
        onSignOutAdmin={() => void handleAdminSignOut()}
        counts={sidebarCounts}
      />

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Supabase Connection / Retry Banner (only if error occurs) */}
          {isSupabaseConfigured && supabaseError && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Could not sync latest vocabulary from Supabase ({supabaseError}).
                  {effectiveLessons.length > 0 ? ' Showing cached vocabulary.' : ''}
                </span>
              </div>
              <button
                type="button"
                disabled={supabaseSyncing}
                onClick={() => void refreshFromSupabase(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${supabaseSyncing ? 'animate-spin' : ''}`} />
                <span>Retry Sync</span>
              </button>
            </div>
          )}

          {isSupabaseConfigured && supabaseLoading && effectiveLessons.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                Loading Vocabulary Library...
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fetching shared Parts, Lessons, Words, and Stories from Supabase.
              </p>
            </div>
          ) : (
            <>
              {currentPage === 'dashboard' && (
                <DashboardView
                  lessons={effectiveLessons}
                  partRecords={isSupabaseConfigured ? sharedParts : []}
                  lessonsPerPart={effectiveSettings.lessonsPerPart}
                  canManageContent={canManageContent}
                  onNavigate={navigate}
                  onNavigateAddLesson={() => navigate('add-lesson')}
                  onOpenLesson={openLesson}
                  onSelectWord={(occurrences) => setModalWordOccurrences(occurrences)}
                />
              )}

              {currentPage === 'parts-lessons' && (
                <PartsAndLessonsView
                  lessons={effectiveLessons}
                  partRecords={isSupabaseConfigured ? sharedParts : []}
                  lessonsPerPart={effectiveSettings.lessonsPerPart}
                  canManageContent={canManageContent}
                  onOpenLesson={openLesson}
                  onEditLesson={(lessonId) => {
                    setActiveLessonId(lessonId);
                    setCurrentPage('edit-lesson');
                  }}
                  onDeleteLesson={(lesson) => setLessonToDelete(lesson)}
                  onToggleComplete={handleToggleLessonComplete}
                  onAddLesson={(partNum) => {
                    setPreferredPartNumber(partNum);
                    navigate('add-lesson');
                  }}
                />
              )}

              {currentPage === 'lesson-detail' && activeLesson && (
                <LessonDetailView
                  lesson={activeLesson}
                  prevLesson={adjacentLessons.prevLesson}
                  nextLesson={adjacentLessons.nextLesson}
                  canManageContent={canManageContent}
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

              {currentPage === 'add-lesson' && canManageContent && (
                <AddEditLessonView
                  mode="add"
                  existingLessons={effectiveLessons}
                  preferredPartNumber={preferredPartNumber}
                  lessonsPerPart={effectiveSettings.lessonsPerPart}
                  wordsPerLesson={effectiveSettings.wordsPerLesson}
                  isSaving={savingLesson}
                  onSaveLesson={handleSaveLesson}
                  onCancel={() => navigate('parts-lessons')}
                />
              )}

              {currentPage === 'edit-lesson' && activeLesson && canManageContent && (
                <AddEditLessonView
                  mode="edit"
                  existingLessons={effectiveLessons}
                  editingLesson={activeLesson}
                  lessonsPerPart={effectiveSettings.lessonsPerPart}
                  wordsPerLesson={effectiveSettings.wordsPerLesson}
                  isSaving={savingLesson}
                  onSaveLesson={handleSaveLesson}
                  onCancel={() => openLesson(activeLesson.id)}
                />
              )}

              {currentPage === 'admin' && adminAuth.isAdmin && (
                <AdminDashboardView
                  adminEmail={adminAuth.email}
                  parts={sharedParts}
                  lessons={effectiveLessons}
                  lessonsPerPart={effectiveSettings.lessonsPerPart}
                  storeDataForBackup={effectiveStoreForBackup}
                  syncing={supabaseSyncing}
                  setupStatus={supabaseSetupStatus}
                  onVerifyDatabaseSetup={() => verifyDatabaseSetup(false)}
                  onRefreshFromSupabase={() => refreshFromSupabase(false)}
                  onOpenLesson={openLesson}
                  onNavigateAddLesson={(partNum) => {
                    setPreferredPartNumber(partNum);
                    navigate('add-lesson');
                  }}
                  onEditLesson={(lessonId) => {
                    setActiveLessonId(lessonId);
                    setCurrentPage('edit-lesson');
                  }}
                  onDeleteLesson={(lesson) => setLessonToDelete(lesson)}
                  onSavePart={handleAdminSavePart}
                  onDeletePart={handleAdminDeletePart}
                  onSaveWord={handleAdminSaveWord}
                  onDeleteWord={handleAdminDeleteWord}
                  onSaveStoryAndReview={handleAdminSaveStoryAndReview}
                  onRunMigration={handleAdminRunMigration}
                  onShowToast={showToast}
                />
              )}

              {currentPage === 'library' && (
                <VocabularyLibraryView
                  lessons={effectiveLessons}
                  onSelectWordOccurrences={(occurrences) => setModalWordOccurrences(occurrences)}
                  onToggleFavoriteWord={handleToggleFavoriteWord}
                  onCopy={handleCopy}
                />
              )}

              {currentPage === 'flashcards' && (
                <FlashcardsView
                  lessons={effectiveLessons}
                  onMarkWord={handleMarkWordOutcome}
                  onToggleFavorite={handleToggleFavoriteWord}
                  onNavigateAddLesson={emptyActionFallback}
                />
              )}

              {currentPage === 'quiz' && (
                <QuizView
                  lessons={effectiveLessons}
                  quizHistory={effectiveActivity.quizHistory}
                  onRecordQuizResult={handleRecordQuizResult}
                  onNavigateAddLesson={emptyActionFallback}
                />
              )}

              {currentPage === 'revision' && (
                <DailyRevisionView
                  lessons={effectiveLessons}
                  dailyTarget={effectiveActivity.dailyRevisionTarget}
                  revisionHistory={effectiveActivity.revisionHistory}
                  initialFilterFavorites={revisionFilterFavorites}
                  onChangeDailyTarget={(target) => {
                    if (isSupabaseConfigured) {
                      setPersonalProgress((prev) => ({
                        ...prev,
                        activity: { ...prev.activity, dailyRevisionTarget: target },
                      }));
                    } else {
                      setLocalStore((prev) => ({
                        ...prev,
                        activity: { ...prev.activity, dailyRevisionTarget: target },
                      }));
                    }
                  }}
                  onMarkWord={handleMarkWordOutcome}
                  onCompleteRevisionSession={handleCompleteRevisionSession}
                  onNavigateAddLesson={emptyActionFallback}
                />
              )}

              {currentPage === 'reading' && (
                <ReadingModeView
                  lessons={effectiveLessons}
                  initialLessonId={activeLessonId ?? undefined}
                  focusMode={readingFocusMode}
                  onToggleFocusMode={setReadingFocusMode}
                  onMarkStoryCompleted={handleMarkStoryCompleted}
                  onNavigateAddLesson={emptyActionFallback}
                />
              )}

              {currentPage === 'progress' && (
                <ProgressTrackerView
                  lessons={effectiveLessons}
                  lessonsPerPart={effectiveSettings.lessonsPerPart}
                  activity={effectiveActivity}
                />
              )}

              {currentPage === 'favorites' && (
                <FavoritesView
                  lessons={effectiveLessons}
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
                  storeData={effectiveStoreForBackup}
                  supabaseConfigured={isSupabaseConfigured}
                  supabaseConfigError={supabaseConfigError}
                  setupStatus={supabaseSetupStatus}
                  isAdmin={adminAuth.isAdmin}
                  adminEmail={adminAuth.email}
                  syncing={supabaseSyncing}
                  onVerifyDatabaseSetup={() => verifyDatabaseSetup(false)}
                  onRefreshSupabase={() => refreshFromSupabase(false)}
                  onOpenAdminLogin={() => setAdminLoginOpen(true)}
                  onOpenAdminDashboard={() => navigate('admin')}
                  onUpdateSettings={handleUpdateSettings}
                  onImportBackup={handleImportBackup}
                  onRestoreSample={handleRestoreSample}
                  onRequestDeleteAll={() => setConfirmDeleteAllOpen(true)}
                  onShowToast={showToast}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals & Toasts */}
      <AdminLoginModal
        open={adminLoginOpen}
        configured={isSupabaseConfigured}
        configError={supabaseConfigError}
        onClose={() => setAdminLoginOpen(false)}
        onLogin={handleAdminLogin}
      />

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
        } vocabulary words from Part ${lessonToDelete?.partNumber ?? ''}${
          isSupabaseConfigured ? ' in Supabase' : ''
        }. Other lessons in this Part will remain untouched.`}
        confirmLabel="Delete Lesson"
        destructive
        onConfirm={() => void handleConfirmDeleteLesson()}
        onCancel={() => setLessonToDelete(null)}
      />

      <ConfirmModal
        open={confirmDeleteAllOpen}
        title={
          isSupabaseConfigured
            ? 'Reset Personal Browser Progress?'
            : 'Delete All Vocabo Data?'
        }
        description={
          isSupabaseConfigured
            ? 'This clears your personal favorites, quiz history, and revision progress from this browser. Shared vocabulary in Supabase will remain completely intact.'
            : 'This will permanently erase all saved lessons, vocabulary words, favorites, quiz history, and revision progress from this browser. Export a JSON backup first if you want to keep a copy.'
        }
        confirmLabel={isSupabaseConfigured ? 'Reset Browser Progress' : 'Delete Everything'}
        destructive
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setConfirmDeleteAllOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
