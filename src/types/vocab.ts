export type RevisionStatus = 'new' | 'known' | 'difficult';

export interface TermMeaning {
  term: string;
  meaning?: string;
}

export interface VocabWord {
  id: string;
  sourceNumber?: number;
  word: string;
  partOfSpeech?: string;
  cefrLevel?: string;
  banglaMeaning: string;
  exampleSentence: string;
  banglaTranslation: string;
  synonyms: TermMeaning[];
  antonyms: TermMeaning[];
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

export interface StoryReviewItem {
  id: string;
  word: string;
  meaning?: string;
  phrase?: string;
  usage: string;
}

export interface Lesson {
  id: string;
  partNumber: number;
  lessonIndexInPart: number; // 1..lessonsPerPart (default 1..5)
  lessonCode: string; // e.g., "1.1", "2.3"
  wordRangeStart: number; // e.g., 1
  wordRangeEnd: number; // e.g., 10
  title?: string;
  words: VocabWord[];
  story: string;
  banglaSummary: string;
  storyWordReview: StoryReviewItem[];
  storyWordReviewRaw?: string;
  rawInput?: string;
  completed: boolean;
  completedAt?: string;
  storyCompleted?: boolean;
  storyCompletedAt?: string;
  lastStudiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartSummary {
  partNumber: number;
  lessons: Lesson[];
  totalWords: number;
  completedLessons: number;
  totalTargetLessons: number;
  progressPercent: number;
}

export type QuizType =
  | 'en-to-bn'
  | 'bn-to-en'
  | 'fill-blank'
  | 'synonym'
  | 'antonym'
  | 'mixed';

export interface QuizAttemptRecord {
  id: string;
  date: string;
  quizType: QuizType;
  questionCount: number;
  score: number;
  accuracy: number;
  scopeLabel: string;
  incorrectWordIds: string[];
}

export interface RevisionSessionRecord {
  id: string;
  date: string;
  targetCount: number;
  completedCount: number;
  knownCount: number;
  difficultCount: number;
}

export interface ReadingSessionRecord {
  id: string;
  date: string;
  lessonId: string;
  lessonCode: string;
  completed: boolean;
}

export interface ActivityStats {
  activeDates: string[]; // YYYY-MM-DD local dates
  dailyActivityCounts: Record<string, number>;
  quizHistory: QuizAttemptRecord[];
  revisionHistory: RevisionSessionRecord[];
  readingHistory: ReadingSessionRecord[];
  dailyRevisionTarget: 10 | 20 | 30;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  lessonsPerPart: number;
  wordsPerLesson: number;
}

export interface VocabStoreData {
  version: number;
  lessons: Lesson[];
  settings: AppSettings;
  activity: ActivityStats;
}

export interface ParsedLessonDraft {
  words: VocabWord[];
  story: string;
  banglaSummary: string;
  storyWordReview: StoryReviewItem[];
  storyWordReviewRaw: string;
}

export interface ParseResult {
  draft: ParsedLessonDraft;
  warnings: string[];
  detectedWordCount: number;
  hasStory: boolean;
  hasBanglaSummary: boolean;
  hasStoryWordReview: boolean;
}

export type AppPage =
  | 'dashboard'
  | 'parts-lessons'
  | 'lesson-detail'
  | 'library'
  | 'flashcards'
  | 'quiz'
  | 'revision'
  | 'reading'
  | 'progress'
  | 'favorites'
  | 'add-lesson'
  | 'edit-lesson'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
