import { Lesson, VocabWord } from '../types/vocab';

/**
 * Simple, understandable spaced repetition intervals (in days):
 * - Wrong / Difficult: resets to 0 days (due immediately / next day)
 * - Known progression: 1 -> 3 -> 7 -> 14 -> 30 days
 */
const INTERVAL_STEPS = [1, 3, 7, 14, 30];

export function computeNextWordReviewState(
  word: VocabWord,
  outcome: 'known' | 'difficult'
): VocabWord {
  const now = new Date();
  const nowIso = now.toISOString();

  if (outcome === 'known') {
    const currentInterval = word.easeIntervalDays ?? 0;
    const nextStep =
      INTERVAL_STEPS.find((step) => step > currentInterval) ??
      INTERVAL_STEPS[INTERVAL_STEPS.length - 1];
    const nextDate = new Date(now.getTime() + nextStep * 24 * 60 * 60 * 1000);

    return {
      ...word,
      revisionStatus: 'known',
      reviewCount: (word.reviewCount ?? 0) + 1,
      correctCount: (word.correctCount ?? 0) + 1,
      easeIntervalDays: nextStep,
      lastReviewedAt: nowIso,
      nextReviewAt: nextDate.toISOString(),
    };
  }

  // Difficult / Need Practice / Incorrect
  const nextDate = new Date(now.getTime() + 12 * 60 * 60 * 1000); // Re-surface within 12h / next session
  return {
    ...word,
    revisionStatus: 'difficult',
    reviewCount: (word.reviewCount ?? 0) + 1,
    incorrectCount: (word.incorrectCount ?? 0) + 1,
    difficultCount: (word.difficultCount ?? 0) + 1,
    easeIntervalDays: 0,
    lastReviewedAt: nowIso,
    nextReviewAt: nextDate.toISOString(),
  };
}

export interface WordWithLesson {
  word: VocabWord;
  lesson: Lesson;
  priorityScore: number;
  isDue: boolean;
}

export function isWordDueForReview(word: VocabWord, now = new Date()): boolean {
  if (word.revisionStatus === 'difficult') return true;
  if (!word.nextReviewAt) return word.revisionStatus === 'new';
  return new Date(word.nextReviewAt).getTime() <= now.getTime();
}

/**
 * Selects words for Daily Revision using spaced repetition priority:
 * 1. Words marked Difficult or answered incorrectly more often
 * 2. Due words & words not reviewed recently
 * 3. Balanced mix of new words and previously studied words
 */
export function buildDailyRevisionQueue(
  lessons: Lesson[],
  targetCount: number
): WordWithLesson[] {
  const now = new Date();
  const nowMs = now.getTime();

  const allEntries: WordWithLesson[] = [];
  for (const lesson of lessons) {
    for (const word of lesson.words) {
      let score = 0;
      const isDue = isWordDueForReview(word, now);

      if (word.revisionStatus === 'difficult') {
        score += 100;
      }
      const netErrors = (word.incorrectCount ?? 0) - (word.correctCount ?? 0);
      if (netErrors > 0) {
        score += netErrors * 20;
      }
      if (word.nextReviewAt && new Date(word.nextReviewAt).getTime() <= nowMs) {
        const overdueDays = Math.min(
          30,
          Math.floor((nowMs - new Date(word.nextReviewAt).getTime()) / (24 * 60 * 60 * 1000))
        );
        score += 45 + overdueDays * 3;
      }
      if (word.revisionStatus === 'new') {
        score += 35;
      }
      if (word.lastReviewedAt) {
        const daysSince = Math.min(
          60,
          Math.floor((nowMs - new Date(word.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000))
        );
        score += daysSince * 2;
      } else {
        score += 15;
      }

      allEntries.push({ word, lesson, priorityScore: score, isDue });
    }
  }

  // Sort descending by priorityScore, with mild randomization within equal tiers
  allEntries.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.word.word.localeCompare(b.word.word);
  });

  // Ensure a mix of difficult/due and new words if available
  return allEntries.slice(0, targetCount);
}

/**
 * Computes current streak, longest streak, and total active days from YYYY-MM-DD strings.
 */
export function calculateStreakMetrics(activeDates: string[]): {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
} {
  const unique = Array.from(new Set(activeDates)).sort();
  if (unique.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
  }

  const toDayNumber = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (24 * 60 * 60 * 1000));
  };

  const dayNums = unique.map(toDayNumber);
  let longest = 1;
  let running = 1;

  for (let i = 1; i < dayNums.length; i++) {
    if (dayNums[i] === dayNums[i - 1] + 1) {
      running += 1;
      if (running > longest) longest = running;
    } else if (dayNums[i] > dayNums[i - 1] + 1) {
      running = 1;
    }
  }

  // Current streak checks if user was active today or yesterday
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const todayNum = toDayNumber(todayStr);
  const lastNum = dayNums[dayNums.length - 1];

  let current = 0;
  if (lastNum === todayNum || lastNum === todayNum - 1) {
    current = 1;
    for (let i = dayNums.length - 2; i >= 0; i--) {
      if (dayNums[i] === dayNums[i + 1] - 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    totalActiveDays: unique.length,
  };
}
