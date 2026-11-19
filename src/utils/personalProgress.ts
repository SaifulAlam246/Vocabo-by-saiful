import {
  ActivityStats,
  AppSettings,
  Lesson,
  PartRecord,
  RevisionStatus,
  VocabWord,
} from '../types/vocab';
import { DEFAULT_ACTIVITY, DEFAULT_SETTINGS, loadStore } from './storage';

const PERSONAL_PROGRESS_KEY = 'vocabo_personal_progress_v1';
const SUPABASE_CACHE_KEY = 'vocabo_supabase_curriculum_cache_v1';

export interface PersonalLessonProgress {
  completed: boolean;
  completedAt?: string;
  storyCompleted?: boolean;
  storyCompletedAt?: string;
  lastStudiedAt?: string;
}

export interface PersonalWordProgress {
  isFavorite: boolean;
  revisionStatus: RevisionStatus;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  difficultCount: number;
  easeIntervalDays?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface PersonalProgressStore {
  seededFromLegacy: boolean;
  lessonProgressByKey: Record<string, PersonalLessonProgress>;
  wordProgressByKey: Record<string, PersonalWordProgress>;
  settings: AppSettings;
  activity: ActivityStats;
}

export function getLessonProgressKeys(lesson: Pick<Lesson, 'id' | 'lessonCode'>): string[] {
  const keys = [lesson.id];
  if (lesson.lessonCode) keys.push(`code:${lesson.lessonCode}`);
  return keys;
}

export function getWordProgressKeys(
  lesson: Pick<Lesson, 'id' | 'lessonCode'>,
  word: Pick<VocabWord, 'id' | 'word'>
): string[] {
  const keys = [word.id];
  if (lesson.lessonCode && word.word) {
    keys.push(`code:${lesson.lessonCode}::${word.word.trim().toLowerCase()}`);
  }
  return keys;
}

function createEmptyPersonalProgress(): PersonalProgressStore {
  const legacy = loadStore();
  const lessonProgressByKey: Record<string, PersonalLessonProgress> = {};
  const wordProgressByKey: Record<string, PersonalWordProgress> = {};

  for (const lesson of legacy.lessons) {
    if (lesson.completed || lesson.storyCompleted || lesson.lastStudiedAt) {
      const lp: PersonalLessonProgress = {
        completed: Boolean(lesson.completed),
        completedAt: lesson.completedAt,
        storyCompleted: Boolean(lesson.storyCompleted),
        storyCompletedAt: lesson.storyCompletedAt,
        lastStudiedAt: lesson.lastStudiedAt,
      };
      for (const k of getLessonProgressKeys(lesson)) {
        lessonProgressByKey[k] = lp;
      }
    }

    for (const w of lesson.words) {
      if (
        w.isFavorite ||
        w.revisionStatus !== 'new' ||
        w.reviewCount > 0 ||
        w.correctCount > 0 ||
        w.incorrectCount > 0 ||
        w.difficultCount > 0
      ) {
        const wp: PersonalWordProgress = {
          isFavorite: Boolean(w.isFavorite),
          revisionStatus: w.revisionStatus,
          reviewCount: w.reviewCount ?? 0,
          correctCount: w.correctCount ?? 0,
          incorrectCount: w.incorrectCount ?? 0,
          difficultCount: w.difficultCount ?? 0,
          easeIntervalDays: w.easeIntervalDays,
          lastReviewedAt: w.lastReviewedAt,
          nextReviewAt: w.nextReviewAt,
        };
        for (const k of getWordProgressKeys(lesson, w)) {
          wordProgressByKey[k] = wp;
        }
      }
    }
  }

  return {
    seededFromLegacy: true,
    lessonProgressByKey,
    wordProgressByKey,
    settings: legacy.settings ?? { ...DEFAULT_SETTINGS },
    activity: legacy.activity ?? { ...DEFAULT_ACTIVITY },
  };
}

export function loadPersonalProgress(): PersonalProgressStore {
  try {
    const raw = localStorage.getItem(PERSONAL_PROGRESS_KEY);
    if (!raw) {
      const seeded = createEmptyPersonalProgress();
      savePersonalProgress(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<PersonalProgressStore>;
    return {
      seededFromLegacy: Boolean(parsed.seededFromLegacy ?? true),
      lessonProgressByKey:
        parsed.lessonProgressByKey && typeof parsed.lessonProgressByKey === 'object'
          ? parsed.lessonProgressByKey
          : {},
      wordProgressByKey:
        parsed.wordProgressByKey && typeof parsed.wordProgressByKey === 'object'
          ? parsed.wordProgressByKey
          : {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      },
      activity: {
        ...DEFAULT_ACTIVITY,
        ...(parsed.activity ?? {}),
        activeDates: Array.isArray(parsed.activity?.activeDates)
          ? parsed.activity.activeDates
          : [],
        dailyActivityCounts:
          parsed.activity?.dailyActivityCounts &&
          typeof parsed.activity.dailyActivityCounts === 'object'
            ? parsed.activity.dailyActivityCounts
            : {},
        quizHistory: Array.isArray(parsed.activity?.quizHistory)
          ? parsed.activity.quizHistory
          : [],
        revisionHistory: Array.isArray(parsed.activity?.revisionHistory)
          ? parsed.activity.revisionHistory
          : [],
        readingHistory: Array.isArray(parsed.activity?.readingHistory)
          ? parsed.activity.readingHistory
          : [],
        dailyRevisionTarget:
          parsed.activity?.dailyRevisionTarget === 20 ||
          parsed.activity?.dailyRevisionTarget === 30
            ? parsed.activity.dailyRevisionTarget
            : 10,
      },
    };
  } catch {
    return createEmptyPersonalProgress();
  }
}

export function savePersonalProgress(progress: PersonalProgressStore): void {
  try {
    localStorage.setItem(PERSONAL_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function applyPersonalProgressToLessons(
  sharedLessons: Lesson[],
  progress: PersonalProgressStore
): Lesson[] {
  return sharedLessons.map((lesson) => {
    const lessonKeys = getLessonProgressKeys(lesson);
    const lp =
      lessonKeys.map((k) => progress.lessonProgressByKey[k]).find(Boolean) ?? null;

    const mergedWords = lesson.words.map((word) => {
      const wordKeys = getWordProgressKeys(lesson, word);
      const wp = wordKeys.map((k) => progress.wordProgressByKey[k]).find(Boolean) ?? null;
      if (!wp) return word;
      return {
        ...word,
        isFavorite: wp.isFavorite,
        revisionStatus: wp.revisionStatus,
        reviewCount: wp.reviewCount,
        correctCount: wp.correctCount,
        incorrectCount: wp.incorrectCount,
        difficultCount: wp.difficultCount,
        easeIntervalDays: wp.easeIntervalDays,
        lastReviewedAt: wp.lastReviewedAt,
        nextReviewAt: wp.nextReviewAt,
      };
    });

    if (!lp) {
      return { ...lesson, words: mergedWords };
    }

    return {
      ...lesson,
      completed: lp.completed,
      completedAt: lp.completedAt,
      storyCompleted: lp.storyCompleted,
      storyCompletedAt: lp.storyCompletedAt,
      lastStudiedAt: lp.lastStudiedAt,
      words: mergedWords,
    };
  });
}

export function clearPersonalProgress(): PersonalProgressStore {
  const cleared: PersonalProgressStore = {
    seededFromLegacy: true,
    lessonProgressByKey: {},
    wordProgressByKey: {},
    settings: { ...DEFAULT_SETTINGS },
    activity: { ...DEFAULT_ACTIVITY },
  };
  savePersonalProgress(cleared);
  return cleared;
}

export interface CachedSupabaseCurriculum {
  cachedAt: string;
  parts: PartRecord[];
  lessons: Lesson[];
}

export function loadCachedSupabaseCurriculum(): CachedSupabaseCurriculum | null {
  try {
    const raw = localStorage.getItem(SUPABASE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSupabaseCurriculum;
    if (!parsed || !Array.isArray(parsed.lessons)) return null;
    return {
      cachedAt: parsed.cachedAt || new Date().toISOString(),
      parts: Array.isArray(parsed.parts) ? parsed.parts : [],
      lessons: parsed.lessons,
    };
  } catch {
    return null;
  }
}

export function saveCachedSupabaseCurriculum(parts: PartRecord[], lessons: Lesson[]): void {
  try {
    const payload: CachedSupabaseCurriculum = {
      cachedAt: new Date().toISOString(),
      parts,
      lessons,
    };
    localStorage.setItem(SUPABASE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Reads existing localStorage curriculum without modifying or deleting it,
 * so Admins can safely preview and migrate legacy data to Supabase.
 */
export function readLegacyLocalLessons(): Lesson[] {
  try {
    const store = loadStore();
    return Array.isArray(store.lessons) ? store.lessons : [];
  } catch {
    return [];
  }
}
