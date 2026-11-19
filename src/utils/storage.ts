import { SAMPLE_LESSON_1_1 } from '../data/sampleLesson';
import { ActivityStats, AppSettings, Lesson, VocabStoreData } from '../types/vocab';

const STORAGE_KEY = 'vocabo_by_saiful_store_v1';
const INITIALIZED_KEY = 'vocabo_by_saiful_initialized_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  lessonsPerPart: 5,
  wordsPerLesson: 10,
};

export const DEFAULT_ACTIVITY: ActivityStats = {
  activeDates: [],
  dailyActivityCounts: {},
  quizHistory: [],
  revisionHistory: [],
  readingHistory: [],
  dailyRevisionTarget: 10,
};

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createInitialStore(): VocabStoreData {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    version: 2,
    lessons: [SAMPLE_LESSON_1_1],
    settings: {
      ...DEFAULT_SETTINGS,
      theme: prefersDark ? 'dark' : 'light',
    },
    activity: { ...DEFAULT_ACTIVITY },
  };
}

function sanitizeLesson(l: Lesson, idx: number): Lesson {
  return {
    id: typeof l.id === 'string' && l.id ? l.id : `lesson_import_${Date.now()}_${idx}`,
    partNumber: typeof l.partNumber === 'number' && l.partNumber >= 1 ? l.partNumber : 1,
    lessonIndexInPart:
      typeof l.lessonIndexInPart === 'number' && l.lessonIndexInPart >= 1
        ? l.lessonIndexInPart
        : 1,
    lessonCode:
      typeof l.lessonCode === 'string' && l.lessonCode
        ? l.lessonCode
        : `${l.partNumber || 1}.${l.lessonIndexInPart || 1}`,
    wordRangeStart: typeof l.wordRangeStart === 'number' ? l.wordRangeStart : 1,
    wordRangeEnd: typeof l.wordRangeEnd === 'number' ? l.wordRangeEnd : 10,
    title: typeof l.title === 'string' ? l.title : undefined,
    words: Array.isArray(l.words)
      ? l.words.map((w, wIdx) => ({
          id: typeof w.id === 'string' && w.id ? w.id : `w_import_${Date.now()}_${idx}_${wIdx}`,
          sourceNumber: typeof w.sourceNumber === 'number' ? w.sourceNumber : undefined,
          word: String(w.word || `Word ${wIdx + 1}`),
          partOfSpeech: w.partOfSpeech ? String(w.partOfSpeech) : undefined,
          cefrLevel: w.cefrLevel ? String(w.cefrLevel) : undefined,
          banglaMeaning: String(w.banglaMeaning || ''),
          exampleSentence: String(w.exampleSentence || ''),
          banglaTranslation: String(w.banglaTranslation || ''),
          synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
          antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
          isFavorite: Boolean(w.isFavorite),
          revisionStatus:
            w.revisionStatus === 'known' || w.revisionStatus === 'difficult'
              ? w.revisionStatus
              : 'new',
          reviewCount: typeof w.reviewCount === 'number' ? w.reviewCount : 0,
          correctCount: typeof w.correctCount === 'number' ? w.correctCount : 0,
          incorrectCount: typeof w.incorrectCount === 'number' ? w.incorrectCount : 0,
          difficultCount: typeof w.difficultCount === 'number' ? w.difficultCount : 0,
          easeIntervalDays: typeof w.easeIntervalDays === 'number' ? w.easeIntervalDays : undefined,
          lastReviewedAt: w.lastReviewedAt,
          nextReviewAt: w.nextReviewAt,
        }))
      : [],
    story: String(l.story || ''),
    banglaSummary: String(l.banglaSummary || ''),
    storyWordReview: Array.isArray(l.storyWordReview) ? l.storyWordReview : [],
    storyWordReviewRaw:
      typeof l.storyWordReviewRaw === 'string' ? l.storyWordReviewRaw : undefined,
    rawInput: typeof l.rawInput === 'string' ? l.rawInput : undefined,
    completed: Boolean(l.completed),
    completedAt: l.completedAt,
    storyCompleted: Boolean(l.storyCompleted),
    storyCompletedAt: l.storyCompletedAt,
    lastStudiedAt: l.lastStudiedAt,
    createdAt: typeof l.createdAt === 'string' ? l.createdAt : new Date().toISOString(),
    updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : new Date().toISOString(),
  };
}

export function loadStore(): VocabStoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const initialized = localStorage.getItem(INITIALIZED_KEY);

    if (!raw && !initialized) {
      const initial = createInitialStore();
      saveStore(initial);
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return initial;
    }

    if (!raw) {
      return {
        version: 2,
        lessons: [],
        settings: { ...DEFAULT_SETTINGS },
        activity: { ...DEFAULT_ACTIVITY },
      };
    }

    const parsed = JSON.parse(raw) as Partial<VocabStoreData>;
    return {
      version: parsed.version ?? 2,
      lessons: Array.isArray(parsed.lessons)
        ? parsed.lessons.map((l, idx) => sanitizeLesson(l, idx))
        : [],
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
    return {
      version: 2,
      lessons: [],
      settings: { ...DEFAULT_SETTINGS },
      activity: { ...DEFAULT_ACTIVITY },
    };
  }
}

export function saveStore(data: VocabStoreData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(INITIALIZED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export function exportStoreToJson(data: VocabStoreData): string {
  return JSON.stringify(
    {
      app: 'Vocabo by Saiful',
      exportedAt: new Date().toISOString(),
      ...data,
    },
    null,
    2
  );
}

export function validateBackupJson(jsonText: string): {
  valid: boolean;
  data?: VocabStoreData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Backup file must contain a valid JSON object.' };
    }

    if (!Array.isArray(parsed.lessons)) {
      return { valid: false, error: 'Backup JSON is missing a valid "lessons" array.' };
    }

    const sanitizedLessons: Lesson[] = parsed.lessons
      .filter((l: unknown): l is Lesson => Boolean(l && typeof l === 'object'))
      .map((l: Lesson, idx: number) => sanitizeLesson(l, idx));

    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
    };

    const rawActivity =
      parsed.activity && typeof parsed.activity === 'object' ? parsed.activity : {};

    const activity: ActivityStats = {
      ...DEFAULT_ACTIVITY,
      ...rawActivity,
      activeDates: Array.isArray(rawActivity.activeDates) ? rawActivity.activeDates : [],
      dailyActivityCounts:
        rawActivity.dailyActivityCounts && typeof rawActivity.dailyActivityCounts === 'object'
          ? rawActivity.dailyActivityCounts
          : {},
      quizHistory: Array.isArray(rawActivity.quizHistory) ? rawActivity.quizHistory : [],
      revisionHistory: Array.isArray(rawActivity.revisionHistory)
        ? rawActivity.revisionHistory
        : [],
      readingHistory: Array.isArray(rawActivity.readingHistory)
        ? rawActivity.readingHistory
        : [],
      dailyRevisionTarget:
        rawActivity.dailyRevisionTarget === 20 || rawActivity.dailyRevisionTarget === 30
          ? rawActivity.dailyRevisionTarget
          : 10,
    };

    return {
      valid: true,
      data: {
        version: typeof parsed.version === 'number' ? parsed.version : 2,
        lessons: sanitizedLessons,
        settings,
        activity,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid JSON file.',
    };
  }
}
