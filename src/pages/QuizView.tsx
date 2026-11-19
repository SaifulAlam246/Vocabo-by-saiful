import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Lesson, QuizAttemptRecord, QuizType, VocabWord } from '../types/vocab';
import { sortLessons } from '../utils/numbering';

interface QuizViewProps {
  lessons: Lesson[];
  quizHistory: QuizAttemptRecord[];
  onRecordQuizResult: (
    attempt: QuizAttemptRecord,
    wordOutcomes: Array<{ lessonId: string; wordId: string; correct: boolean }>
  ) => void;
  onNavigateAddLesson: () => void;
}

interface QuizQuestion {
  id: string;
  wordId: string;
  lessonId: string;
  lessonCode: string;
  type: Exclude<QuizType, 'mixed'>;
  promptLabel: string;
  promptText: string;
  options: string[];
  correctAnswer: string;
  vocab: VocabWord;
}

interface AnsweredItem {
  question: QuizQuestion;
  selected: string;
  isCorrect: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function maskWordInSentence(sentence: string, targetWord: string): string | null {
  if (!sentence.trim() || !targetWord.trim()) return null;
  const escaped = targetWord.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}(?:s|es|ed|d|ing|ly)?\\b`, 'i');
  if (!regex.test(sentence)) return null;
  return sentence.replace(regex, '_____');
}

const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  'en-to-bn': 'Type A · English → Bangla',
  'bn-to-en': 'Type B · Bangla → English',
  'fill-blank': 'Type C · Fill in the Blank',
  synonym: 'Type D · Synonym Challenge',
  antonym: 'Type E · Antonym Challenge',
  mixed: 'Mixed Challenge (All Types)',
};

export const QuizView: React.FC<QuizViewProps> = ({
  lessons,
  quizHistory,
  onRecordQuizResult,
  onNavigateAddLesson,
}) => {
  const sortedLessons = useMemo(() => sortLessons(lessons), [lessons]);
  const partNumbers = useMemo(
    () => Array.from(new Set(sortedLessons.map((l) => l.partNumber))).sort((a, b) => a - b),
    [sortedLessons]
  );

  const [quizType, setQuizType] = useState<QuizType>('en-to-bn');
  const [questionCount, setQuestionCount] = useState<10 | 20 | 50>(10);
  const [scope, setScope] = useState<'all' | 'part' | 'lesson'>('all');
  const [selectedPart, setSelectedPart] = useState<string>(() =>
    partNumbers[0] ? String(partNumbers[0]) : '1'
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    () => sortedLessons[0]?.id || ''
  );

  const [phase, setPhase] = useState<'setup' | 'playing' | 'result'>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answeredItems, setAnsweredItems] = useState<AnsweredItem[]>([]);
  const [currentScopeLabel, setCurrentScopeLabel] = useState('All Words');

  const allPool = useMemo(() => {
    const items: Array<{ word: VocabWord; lesson: Lesson }> = [];
    for (const lesson of sortedLessons) {
      for (const word of lesson.words) {
        items.push({ word, lesson });
      }
    }
    return items;
  }, [sortedLessons]);

  const scopedPool = useMemo(() => {
    return allPool.filter(({ lesson }) => {
      if (scope === 'part') return lesson.partNumber === Number(selectedPart);
      if (scope === 'lesson') return lesson.id === selectedLessonId;
      return true;
    });
  }, [allPool, scope, selectedPart, selectedLessonId]);

  const buildQuestionForEntry = (
    entry: { word: VocabWord; lesson: Lesson },
    preferredType: QuizType
  ): QuizQuestion | null => {
    const { word, lesson } = entry;
    const allMeanings = Array.from(
      new Set(allPool.map((p) => p.word.banglaMeaning.trim()).filter(Boolean))
    );
    const allWords = Array.from(
      new Set(allPool.map((p) => p.word.word.trim()).filter(Boolean))
    );
    const allSynonymTerms = Array.from(
      new Set(
        allPool.flatMap((p) => p.word.synonyms.map((s) => s.term.trim())).filter(Boolean)
      )
    );
    const allAntonymTerms = Array.from(
      new Set(
        allPool.flatMap((p) => p.word.antonyms.map((a) => a.term.trim())).filter(Boolean)
      )
    );

    const candidateTypes: Array<Exclude<QuizType, 'mixed'>> =
      preferredType === 'mixed'
        ? shuffleArray(['en-to-bn', 'bn-to-en', 'fill-blank', 'synonym', 'antonym'])
        : [preferredType];

    for (const type of candidateTypes) {
      if (type === 'en-to-bn' && word.banglaMeaning.trim()) {
        const distractors = shuffleArray(
          allMeanings.filter((m) => m !== word.banglaMeaning.trim())
        ).slice(0, 3);
        if (distractors.length >= 1) {
          return {
            id: `q_${word.id}_${Math.random().toString(36).slice(2, 6)}`,
            wordId: word.id,
            lessonId: lesson.id,
            lessonCode: lesson.lessonCode,
            type,
            promptLabel: 'Select the correct Bangla meaning',
            promptText: word.word,
            options: shuffleArray([word.banglaMeaning.trim(), ...distractors]),
            correctAnswer: word.banglaMeaning.trim(),
            vocab: word,
          };
        }
      }

      if (type === 'bn-to-en' && word.banglaMeaning.trim()) {
        const distractors = shuffleArray(
          allWords.filter((w) => w.toLowerCase() !== word.word.trim().toLowerCase())
        ).slice(0, 3);
        if (distractors.length >= 1) {
          return {
            id: `q_${word.id}_${Math.random().toString(36).slice(2, 6)}`,
            wordId: word.id,
            lessonId: lesson.id,
            lessonCode: lesson.lessonCode,
            type,
            promptLabel: 'Select the English word matching this meaning',
            promptText: word.banglaMeaning.trim(),
            options: shuffleArray([word.word.trim(), ...distractors]),
            correctAnswer: word.word.trim(),
            vocab: word,
          };
        }
      }

      if (type === 'fill-blank') {
        const masked = maskWordInSentence(word.exampleSentence, word.word);
        if (masked) {
          const distractors = shuffleArray(
            allWords.filter((w) => w.toLowerCase() !== word.word.trim().toLowerCase())
          ).slice(0, 3);
          if (distractors.length >= 1) {
            return {
              id: `q_${word.id}_${Math.random().toString(36).slice(2, 6)}`,
              wordId: word.id,
              lessonId: lesson.id,
              lessonCode: lesson.lessonCode,
              type,
              promptLabel: 'Fill in the blank with the correct word',
              promptText: masked,
              options: shuffleArray([word.word.trim(), ...distractors]),
              correctAnswer: word.word.trim(),
              vocab: word,
            };
          }
        }
      }

      if (type === 'synonym' && word.synonyms.length > 0) {
        const targetSyn = word.synonyms[0].term.trim();
        const ownSyns = new Set(word.synonyms.map((s) => s.term.trim().toLowerCase()));
        const distractorPool = Array.from(
          new Set([...allSynonymTerms, ...allWords])
        ).filter(
          (term) =>
            term.toLowerCase() !== word.word.trim().toLowerCase() &&
            !ownSyns.has(term.toLowerCase())
        );
        const distractors = shuffleArray(distractorPool).slice(0, 3);
        if (targetSyn && distractors.length >= 1) {
          return {
            id: `q_${word.id}_${Math.random().toString(36).slice(2, 6)}`,
            wordId: word.id,
            lessonId: lesson.id,
            lessonCode: lesson.lessonCode,
            type,
            promptLabel: 'Select the correct synonym',
            promptText: word.word,
            options: shuffleArray([targetSyn, ...distractors]),
            correctAnswer: targetSyn,
            vocab: word,
          };
        }
      }

      if (type === 'antonym' && word.antonyms.length > 0) {
        const targetAnt = word.antonyms[0].term.trim();
        const ownAnts = new Set(word.antonyms.map((a) => a.term.trim().toLowerCase()));
        const distractorPool = Array.from(
          new Set([...allAntonymTerms, ...allWords])
        ).filter(
          (term) =>
            term.toLowerCase() !== word.word.trim().toLowerCase() &&
            !ownAnts.has(term.toLowerCase())
        );
        const distractors = shuffleArray(distractorPool).slice(0, 3);
        if (targetAnt && distractors.length >= 1) {
          return {
            id: `q_${word.id}_${Math.random().toString(36).slice(2, 6)}`,
            wordId: word.id,
            lessonId: lesson.id,
            lessonCode: lesson.lessonCode,
            type,
            promptLabel: 'Select the correct antonym',
            promptText: word.word,
            options: shuffleArray([targetAnt, ...distractors]),
            correctAnswer: targetAnt,
            vocab: word,
          };
        }
      }
    }

    return null;
  };

  const startQuiz = (customPool?: Array<{ word: VocabWord; lesson: Lesson }>, labelOverride?: string) => {
    const source = customPool ?? scopedPool;
    const shuffledSource = shuffleArray(source);

    // Avoid repeating the same word within one quiz session
    const seenWordKeys = new Set<string>();
    const built: QuizQuestion[] = [];

    for (const entry of shuffledSource) {
      const normKey = entry.word.word.trim().toLowerCase();
      if (seenWordKeys.has(normKey)) continue;
      const q = buildQuestionForEntry(entry, quizType);
      if (q) {
        seenWordKeys.add(normKey);
        built.push(q);
      }
      if (built.length >= questionCount) break;
    }

    if (built.length === 0) return;

    const label =
      labelOverride ??
      (scope === 'all'
        ? 'All Words'
        : scope === 'part'
          ? `Part ${selectedPart}`
          : `Lesson ${
              sortedLessons.find((l) => l.id === selectedLessonId)?.lessonCode || ''
            }`);

    setCurrentScopeLabel(label);
    setQuestions(built);
    setQIndex(0);
    setSelectedOption(null);
    setAnsweredItems([]);
    setPhase('playing');
  };

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null) return;
    const currentQ = questions[qIndex];
    if (!currentQ) return;

    setSelectedOption(option);
    const isCorrect = option === currentQ.correctAnswer;
    setAnsweredItems((prev) => [...prev, { question: currentQ, selected: option, isCorrect }]);
  };

  const handleNextQuestion = () => {
    if (qIndex + 1 < questions.length) {
      setQIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      // Quiz finished: record history and word outcomes
      const score = answeredItems.filter((a) => a.isCorrect).length;
      const total = questions.length;
      const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
      const incorrectWordIds = answeredItems
        .filter((a) => !a.isCorrect)
        .map((a) => a.question.wordId);

      const attempt: QuizAttemptRecord = {
        id: `quiz_${Date.now()}`,
        date: new Date().toISOString(),
        quizType,
        questionCount: total,
        score,
        accuracy,
        scopeLabel: currentScopeLabel,
        incorrectWordIds,
      };

      const wordOutcomes = answeredItems.map((a) => ({
        lessonId: a.question.lessonId,
        wordId: a.question.wordId,
        correct: a.isCorrect,
      }));

      onRecordQuizResult(attempt, wordOutcomes);
      setPhase('result');
    }
  };

  const handleRetryIncorrect = () => {
    const wrongEntries = answeredItems
      .filter((a) => !a.isCorrect)
      .map((a) => {
        const lesson = sortedLessons.find((l) => l.id === a.question.lessonId);
        return lesson ? { word: a.question.vocab, lesson } : null;
      })
      .filter((x): x is { word: VocabWord; lesson: Lesson } => x !== null);

    if (wrongEntries.length > 0) {
      startQuiz(wrongEntries, 'Incorrect Words Retry');
    }
  };

  const previewEligibleCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    for (const entry of scopedPool) {
      const k = entry.word.word.trim().toLowerCase();
      if (seen.has(k)) continue;
      if (buildQuestionForEntry(entry, quizType)) {
        seen.add(k);
        count++;
      }
    }
    return count;
  }, [scopedPool, quizType, allPool]);

  const currentQuestion = questions[qIndex];
  const liveScore = answeredItems.filter((a) => a.isCorrect).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
          Vocabulary Quiz
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Test meanings, fill-in-the-blank usage, synonyms, and antonyms from your saved lessons.
        </p>
      </div>

      {allPool.length < 2 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            Add More Words to Start a Quiz
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Save at least one lesson with multiple words to generate multiple-choice questions.
          </p>
          <button
            type="button"
            onClick={onNavigateAddLesson}
            className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Add New Lesson
          </button>
        </div>
      ) : phase === 'setup' ? (
        <div className="space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
            {/* Quiz Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Quiz Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(QUIZ_TYPE_LABELS) as QuizType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setQuizType(type)}
                    className={`px-3.5 py-2.5 min-h-[44px] rounded-lg text-left text-xs sm:text-sm font-medium border transition-colors ${
                      quizType === type
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {QUIZ_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count & Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Question Count
                </label>
                <div className="flex items-center gap-2">
                  {([10, 20, 50] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-2.5 min-h-[42px] rounded-lg text-sm font-mono-num font-semibold border transition-colors ${
                        questionCount === cnt
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Vocabulary Scope
                </label>
                <div className="flex items-center gap-2">
                  {(['all', 'part', 'lesson'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setScope(sc)}
                      className={`flex-1 py-2.5 min-h-[42px] rounded-lg text-xs font-semibold border capitalize transition-colors ${
                        scope === sc
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sc === 'all' ? 'All Words' : sc === 'part' ? 'Part' : 'Lesson'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {scope === 'part' && (
              <div>
                <select
                  value={selectedPart}
                  onChange={(e) => setSelectedPart(e.target.value)}
                  aria-label="Choose Part"
                  className="w-full sm:w-64 px-3 py-2.5 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                >
                  {partNumbers.map((num) => (
                    <option key={num} value={String(num)}>
                      Part {num}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === 'lesson' && (
              <div>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  aria-label="Choose Lesson"
                  className="w-full sm:w-72 px-3 py-2.5 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                >
                  {sortedLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      Part {l.partNumber} · Lesson {l.lessonCode} ({l.words.length} words)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                {previewEligibleCount} eligible unique question
                {previewEligibleCount === 1 ? '' : 's'} available
              </span>

              <button
                type="button"
                disabled={previewEligibleCount === 0}
                onClick={() => startQuiz()}
                className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <span>Start Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Recent Quiz History */}
          {quizHistory.length > 0 && (
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 mb-3">
                Recent Quiz Attempts
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {quizHistory.slice(0, 5).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {QUIZ_TYPE_LABELS[attempt.quizType]}
                      </span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {attempt.scopeLabel}
                      </span>
                    </div>
                    <div className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      {attempt.score}/{attempt.questionCount} ({attempt.accuracy}%)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : phase === 'playing' && currentQuestion ? (
        <div className="space-y-4">
          {/* Top Progress */}
          <div className="flex items-center justify-between text-xs font-mono-num text-slate-500 dark:text-slate-400">
            <span>
              Question {qIndex + 1} of {questions.length} · Lesson {currentQuestion.lessonCode}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Score: {liveScore}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-200"
              style={{ width: `${Math.round(((qIndex + 1) / questions.length) * 100)}%` }}
            />
          </div>

          {/* Question Card */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 space-y-6">
            <div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {currentQuestion.promptLabel}
              </div>
              <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 leading-snug">
                {currentQuestion.promptText}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const isAnswered = selectedOption !== null;
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentQuestion.correctAnswer;

                let btnClass =
                  'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';
                if (isAnswered) {
                  if (isCorrect) {
                    btnClass =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200';
                  } else if (isSelected) {
                    btnClass =
                      'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200';
                  } else {
                    btnClass =
                      'border-slate-200 dark:border-slate-800 opacity-60 text-slate-500 dark:text-slate-400';
                  }
                }

                return (
                  <button
                    key={`${opt}_${idx}`}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full px-4 py-3.5 min-h-[48px] rounded-xl border text-left text-sm sm:text-base font-medium flex items-center justify-between gap-3 transition-colors ${btnClass}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Feedback & Vocabulary Explanation */}
            {selectedOption !== null && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {selectedOption === currentQuestion.correctAnswer ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Correct Answer
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">
                        Incorrect — Correct answer: {currentQuestion.correctAnswer}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">{currentQuestion.vocab.word}</span> —{' '}
                    {currentQuestion.vocab.banglaMeaning}
                  </p>
                  {currentQuestion.vocab.exampleSentence && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      {currentQuestion.vocab.exampleSentence}
                    </p>
                  )}
                  {currentQuestion.vocab.banglaTranslation && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {currentQuestion.vocab.banglaTranslation}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <span>
                      {qIndex + 1 < questions.length ? 'Next Question' : 'View Results'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* QUIZ RESULT SCREEN */
        <div className="space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center">
            <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100">
              Quiz Completed
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {QUIZ_TYPE_LABELS[quizType]} · {currentScopeLabel}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">Score</div>
                <div className="mt-1 font-mono-num text-xl font-bold text-slate-900 dark:text-slate-100">
                  {liveScore}/{questions.length}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">Accuracy</div>
                <div className="mt-1 font-mono-num text-xl font-bold text-blue-600 dark:text-blue-400">
                  {questions.length > 0 ? Math.round((liveScore / questions.length) * 100) : 0}%
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500">Incorrect</div>
                <div className="mt-1 font-mono-num text-xl font-bold text-rose-600 dark:text-rose-400">
                  {questions.length - liveScore}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {questions.length - liveScore > 0 && (
                <button
                  type="button"
                  onClick={handleRetryIncorrect}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Incorrect ({questions.length - liveScore})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => startQuiz()}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <span>New Quiz</span>
              </button>

              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Change Settings
              </button>
            </div>
          </section>

          {/* Answer Breakdown */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 mb-3">
              Answer Review
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {answeredItems.map((item, idx) => (
                <div key={item.question.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-xs text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {item.question.vocab.word}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({item.question.vocab.banglaMeaning})
                      </span>
                    </div>
                    {!item.isCorrect && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        Your answer: {item.selected} · Correct: {item.question.correctAnswer}
                      </p>
                    )}
                  </div>
                  {item.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
