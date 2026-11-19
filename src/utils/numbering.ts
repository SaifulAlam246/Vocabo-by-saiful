import { Lesson, PartRecord, PartSummary } from '../types/vocab';

export function formatLessonCode(partNumber: number, lessonIndexInPart: number): string {
  return `${partNumber}.${lessonIndexInPart}`;
}

export function getWordRangeForLesson(
  partNumber: number,
  lessonIndexInPart: number,
  lessonsPerPart = 5,
  wordsPerLesson = 10
): { start: number; end: number } {
  const globalLessonIndex = (partNumber - 1) * lessonsPerPart + (lessonIndexInPart - 1);
  const start = globalLessonIndex * wordsPerLesson + 1;
  const end = start + wordsPerLesson - 1;
  return { start, end };
}

export function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.partNumber !== b.partNumber) return a.partNumber - b.partNumber;
    if (a.lessonIndexInPart !== b.lessonIndexInPart) {
      return a.lessonIndexInPart - b.lessonIndexInPart;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function computeNextLessonSlot(
  lessons: Lesson[],
  lessonsPerPart = 5
): { partNumber: number; lessonIndexInPart: number; lessonCode: string } {
  if (lessons.length === 0) {
    return { partNumber: 1, lessonIndexInPart: 1, lessonCode: '1.1' };
  }

  const occupied = new Set(lessons.map((l) => `${l.partNumber}.${l.lessonIndexInPart}`));

  const sorted = sortLessons(lessons);
  const last = sorted[sorted.length - 1];
  let nextPart = last.partNumber;
  let nextIdx = last.lessonIndexInPart + 1;

  if (nextIdx > lessonsPerPart) {
    nextPart += 1;
    nextIdx = 1;
  }

  // Ensure uniqueness if an unusual custom slot exists
  while (occupied.has(`${nextPart}.${nextIdx}`)) {
    nextIdx += 1;
    if (nextIdx > lessonsPerPart) {
      nextPart += 1;
      nextIdx = 1;
    }
  }

  return {
    partNumber: nextPart,
    lessonIndexInPart: nextIdx,
    lessonCode: formatLessonCode(nextPart, nextIdx),
  };
}

export function groupLessonsIntoParts(
  lessons: Lesson[],
  lessonsPerPart = 5,
  partRecords: PartRecord[] = []
): PartSummary[] {
  const sorted = sortLessons(lessons);
  const map = new Map<number, Lesson[]>();
  const recordByNumber = new Map<number, PartRecord>();

  for (const pr of partRecords) {
    recordByNumber.set(pr.partNumber, pr);
    if (!map.has(pr.partNumber)) {
      map.set(pr.partNumber, []);
    }
  }

  for (const lesson of sorted) {
    const existing = map.get(lesson.partNumber) ?? [];
    existing.push(lesson);
    map.set(lesson.partNumber, existing);
  }

  const parts: PartSummary[] = [];
  const partNumbers = Array.from(map.keys()).sort((a, b) => a - b);

  for (const partNumber of partNumbers) {
    const partLessons = map.get(partNumber) ?? [];
    const rec = recordByNumber.get(partNumber);
    const totalWords = partLessons.reduce((sum, l) => sum + l.words.length, 0);
    const completedLessons = partLessons.filter((l) => l.completed).length;
    const totalTargetLessons = Math.max(lessonsPerPart, partLessons.length);
    const progressPercent =
      totalTargetLessons > 0 ? Math.round((completedLessons / totalTargetLessons) * 100) : 0;

    parts.push({
      id: rec?.id,
      partNumber,
      title: rec?.title || `Part ${partNumber}`,
      description: rec?.description || '',
      lessons: partLessons,
      totalWords,
      completedLessons,
      totalTargetLessons,
      progressPercent,
    });
  }

  return parts;
}

export function getAdjacentLessons(
  lessons: Lesson[],
  currentLessonId: string
): { prevLesson: Lesson | null; nextLesson: Lesson | null } {
  const sorted = sortLessons(lessons);
  const idx = sorted.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) return { prevLesson: null, nextLesson: null };
  return {
    prevLesson: idx > 0 ? sorted[idx - 1] : null,
    nextLesson: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}
