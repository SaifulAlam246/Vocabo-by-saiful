import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  Edit3,
  Eye,
  FileText,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Lesson, ParsedLessonDraft, VocabWord } from '../types/vocab';
import { PASTE_TEMPLATE_EXAMPLE } from '../data/sampleLesson';
import {
  formatLessonToMarkdown,
  parseLessonContent,
  parseStoryWordReview,
  parseTermMeaningList,
} from '../utils/lessonParser';
import {
  computeNextLessonSlot,
  formatLessonCode,
  getWordRangeForLesson,
} from '../utils/numbering';

interface AddEditLessonViewProps {
  mode: 'add' | 'edit';
  existingLessons: Lesson[];
  editingLesson?: Lesson | null;
  preferredPartNumber?: number;
  lessonsPerPart: number;
  wordsPerLesson: number;
  onSaveLesson: (lesson: Lesson, isEdit: boolean) => void;
  onCancel: () => void;
}

export const AddEditLessonView: React.FC<AddEditLessonViewProps> = ({
  mode,
  existingLessons,
  editingLesson,
  preferredPartNumber,
  lessonsPerPart,
  wordsPerLesson,
  onSaveLesson,
  onCancel,
}) => {
  const autoSlot = useMemo(() => {
    if (preferredPartNumber && preferredPartNumber >= 1) {
      const partLessons = existingLessons.filter((l) => l.partNumber === preferredPartNumber);
      const usedIndices = new Set(partLessons.map((l) => l.lessonIndexInPart));
      let idx = 1;
      while (usedIndices.has(idx)) idx++;
      return {
        partNumber: preferredPartNumber,
        lessonIndexInPart: idx,
        lessonCode: formatLessonCode(preferredPartNumber, idx),
      };
    }
    return computeNextLessonSlot(existingLessons, lessonsPerPart);
  }, [existingLessons, preferredPartNumber, lessonsPerPart]);

  const [rawText, setRawText] = useState<string>(() => {
    if (mode === 'edit' && editingLesson) {
      return editingLesson.rawInput || formatLessonToMarkdown(editingLesson);
    }
    return '';
  });

  const [overrideNumbering, setOverrideNumbering] = useState<boolean>(mode === 'edit');
  const [partNumber, setPartNumber] = useState<number>(() =>
    mode === 'edit' && editingLesson ? editingLesson.partNumber : autoSlot.partNumber
  );
  const [lessonIndexInPart, setLessonIndexInPart] = useState<number>(() =>
    mode === 'edit' && editingLesson
      ? editingLesson.lessonIndexInPart
      : autoSlot.lessonIndexInPart
  );

  const [step, setStep] = useState<'paste' | 'preview'>(() =>
    mode === 'edit' ? 'preview' : 'paste'
  );

  const [draft, setDraft] = useState<ParsedLessonDraft>(() => {
    if (mode === 'edit' && editingLesson) {
      return {
        words: editingLesson.words,
        story: editingLesson.story,
        banglaSummary: editingLesson.banglaSummary,
        storyWordReview: editingLesson.storyWordReview,
        storyWordReviewRaw:
          editingLesson.storyWordReviewRaw ||
          editingLesson.storyWordReview
            .map((r) => {
              const meaningPart = r.meaning ? ` (${r.meaning})` : '';
              if (r.phrase) {
                const usagePart = r.usage ? ` ${r.usage}` : '';
                return `- **${r.word}**${meaningPart} → *${r.phrase}${r.usage ? ':' : ''}*${usagePart}`;
              }
              const usagePart = r.usage ? `: ${r.usage}` : '';
              return `- **${r.word}**${meaningPart}${usagePart}`;
            })
            .join('\n'),
      };
    }
    return {
      words: [],
      story: '',
      banglaSummary: '',
      storyWordReview: [],
      storyWordReviewRaw: '',
    };
  });

  const [warnings, setWarnings] = useState<string[]>([]);
  const [editingWordIdx, setEditingWordIdx] = useState<number | null>(null);

  useEffect(() => {
    if (mode === 'add' && !overrideNumbering) {
      setPartNumber(autoSlot.partNumber);
      setLessonIndexInPart(autoSlot.lessonIndexInPart);
    }
  }, [autoSlot, mode, overrideNumbering]);

  const effectivePart = overrideNumbering ? Math.max(1, partNumber) : autoSlot.partNumber;
  const effectiveLessonIdx = overrideNumbering
    ? Math.max(1, lessonIndexInPart)
    : autoSlot.lessonIndexInPart;
  const effectiveCode = formatLessonCode(effectivePart, effectiveLessonIdx);
  const effectiveRange = getWordRangeForLesson(
    effectivePart,
    effectiveLessonIdx,
    lessonsPerPart,
    wordsPerLesson
  );

  const conflictingLesson = useMemo(() => {
    return existingLessons.find(
      (l) =>
        l.partNumber === effectivePart &&
        l.lessonIndexInPart === effectiveLessonIdx &&
        l.id !== editingLesson?.id
    );
  }, [existingLessons, effectivePart, effectiveLessonIdx, editingLesson]);

  const handleOrganize = () => {
    const result = parseLessonContent(rawText);

    // If editing an existing lesson and re-parsing, preserve favorite/revision stats by matching word text
    if (mode === 'edit' && editingLesson) {
      const oldMap = new Map(
        editingLesson.words.map((w) => [w.word.trim().toLowerCase(), w])
      );
      result.draft.words = result.draft.words.map((w) => {
        const prev = oldMap.get(w.word.trim().toLowerCase());
        if (!prev) return w;
        return {
          ...w,
          id: prev.id,
          isFavorite: prev.isFavorite,
          revisionStatus: prev.revisionStatus,
          reviewCount: prev.reviewCount,
          correctCount: prev.correctCount ?? 0,
          incorrectCount: prev.incorrectCount ?? 0,
          difficultCount: prev.difficultCount,
          easeIntervalDays: prev.easeIntervalDays,
          lastReviewedAt: prev.lastReviewedAt,
          nextReviewAt: prev.nextReviewAt,
        };
      });
    }

    setDraft(result.draft);
    setWarnings(result.warnings);
    setEditingWordIdx(null);
    setStep('preview');
  };

  const handleLoadExample = () => {
    setRawText(PASTE_TEMPLATE_EXAMPLE);
  };

  const handleUpdateWord = (index: number, patch: Partial<VocabWord>) => {
    setDraft((prev) => {
      const updated = [...prev.words];
      updated[index] = { ...updated[index], ...patch };
      return { ...prev, words: updated };
    });
  };

  const handleAddEmptyWord = () => {
    const newWord: VocabWord = {
      id: `w_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sourceNumber: effectiveRange.start + draft.words.length,
      word: 'New Word',
      banglaMeaning: '',
      exampleSentence: '',
      banglaTranslation: '',
      synonyms: [],
      antonyms: [],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    };
    setDraft((prev) => ({
      ...prev,
      words: [...prev.words, newWord],
    }));
    setEditingWordIdx(draft.words.length);
  };

  const handleRemoveWord = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      words: prev.words.filter((_, i) => i !== index),
    }));
    setEditingWordIdx(null);
  };

  const handleSave = () => {
    const now = new Date().toISOString();

    const firstNum = draft.words[0]?.sourceNumber;
    const lastNum = draft.words[draft.words.length - 1]?.sourceNumber;
    const rangeStart =
      typeof firstNum === 'number' && !overrideNumbering ? firstNum : effectiveRange.start;
    const rangeEnd =
      typeof lastNum === 'number' && !overrideNumbering
        ? lastNum
        : rangeStart + Math.max(0, draft.words.length - 1);

    const parsedReview = parseStoryWordReview(draft.storyWordReviewRaw);

    const lessonToSave: Lesson = {
      id:
        mode === 'edit' && editingLesson
          ? editingLesson.id
          : `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      partNumber: effectivePart,
      lessonIndexInPart: effectiveLessonIdx,
      lessonCode: effectiveCode,
      wordRangeStart: rangeStart,
      wordRangeEnd: rangeEnd,
      words: draft.words,
      story: draft.story.trim(),
      banglaSummary: draft.banglaSummary.trim(),
      storyWordReview: parsedReview,
      storyWordReviewRaw: draft.storyWordReviewRaw.trim(),
      rawInput: rawText.trim() || undefined,
      completed: mode === 'edit' && editingLesson ? editingLesson.completed : false,
      completedAt: mode === 'edit' && editingLesson ? editingLesson.completedAt : undefined,
      storyCompleted: mode === 'edit' && editingLesson ? editingLesson.storyCompleted : false,
      storyCompletedAt:
        mode === 'edit' && editingLesson ? editingLesson.storyCompletedAt : undefined,
      lastStudiedAt:
        mode === 'edit' && editingLesson ? editingLesson.lastStudiedAt : undefined,
      createdAt: mode === 'edit' && editingLesson ? editingLesson.createdAt : now,
      updatedAt: now,
    };

    onSaveLesson(lessonToSave, mode === 'edit');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            {mode === 'edit' ? `Edit Lesson ${editingLesson?.lessonCode}` : 'Add New Lesson'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Paste your formatted ChatGPT vocabulary batch below. Vocabo will organize all words,
            story, Bangla summary, and word review automatically.
          </p>
        </div>

        {/* Step Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setStep('paste')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              step === 'paste'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>1. Paste Content</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (draft.words.length === 0 && rawText.trim()) {
                handleOrganize();
              } else {
                setStep('preview');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              step === 'preview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2. Preview &amp; Save</span>
          </button>
        </div>
      </div>

      {/* Automatic Numbering & Optional Override Bar */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {overrideNumbering ? 'Manual Numbering' : 'Automatic Numbering'}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm sm:text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              <span>Part {effectivePart}</span>
              <span aria-hidden="true">·</span>
              <span>Lesson {effectiveCode}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                Words {effectiveRange.start}–{effectiveRange.end}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOverrideNumbering((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{overrideNumbering ? 'Use Auto Numbering' : 'Override Part / Lesson'}</span>
          </button>
        </div>

        {overrideNumbering && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="part-number-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Part Number
              </label>
              <input
                id="part-number-input"
                type="number"
                min={1}
                value={partNumber}
                onChange={(e) => setPartNumber(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="lesson-index-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Lesson Number in Part (1–{lessonsPerPart})
              </label>
              <input
                id="lesson-index-input"
                type="number"
                min={1}
                value={lessonIndexInPart}
                onChange={(e) =>
                  setLessonIndexInPart(Math.max(1, parseInt(e.target.value || '1', 10)))
                }
                className="w-full px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}

        {conflictingLesson && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Lesson {effectiveCode} already exists. Saving with this number will keep both or you
              can change the lesson number above.
            </span>
          </div>
        )}
      </section>

      {/* STEP 1: PASTE AREA */}
      {step === 'paste' && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="lesson-paste-area"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Paste Complete Lesson Content
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadExample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Load Sample Template</span>
              </button>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            id="lesson-paste-area"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={16}
            placeholder={`Paste your ChatGPT lesson here...\n\nExample:\n## 11. Accurate\n**Meaning:** সঠিক, নির্ভুল\n**Example:** Make sure your measurements are accurate.\n**বাংলা:** নিশ্চিত করুন আপনার মাপগুলো সঠিক আছে।\n**Synonyms:** Exact (সঠিক), Precise (নির্ভুল)\n**Antonyms:** Inaccurate (ভুল)\n\n## Story\n...\n\n## বাংলা সারাংশ\n...\n\n## Story Word Review\n...`}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports Markdown headings, Bangla/English labels, Story, বাংলা সারাংশ, and Story Word
              Review.
            </p>
            <button
              type="button"
              onClick={handleOrganize}
              disabled={!rawText.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Organize Lesson</span>
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: PREVIEW & MANUAL EDITING */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Diagnostics / Warnings */}
          {warnings.length > 0 && (
            <section className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-sm text-amber-900 dark:text-amber-200">
                    Parsing Notes ({warnings.length})
                  </h2>
                  <ul className="mt-1.5 space-y-1 text-xs sm:text-sm text-amber-800 dark:text-amber-300 list-disc pl-4">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <span className="font-semibold font-mono-num">{draft.words.length}</span> words
              organized · Story {draft.story ? 'detected' : 'empty'} · Bangla Summary{' '}
              {draft.banglaSummary ? 'detected' : 'empty'}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep('paste')}
                className="px-4 py-2 min-h-[42px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Back to Paste
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={draft.words.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 min-h-[42px] rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{mode === 'edit' ? 'Save Changes' : 'Save Lesson'}</span>
              </button>
            </div>
          </div>

          {/* Parsed Words List (with inline edit per word) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
                Vocabulary Words ({draft.words.length})
              </h2>
              <button
                type="button"
                onClick={handleAddEmptyWord}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Word</span>
              </button>
            </div>

            {draft.words.map((word, idx) => {
              const isEditingThis = editingWordIdx === idx;
              return (
                <div
                  key={word.id}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono-num text-xs text-slate-400">
                          {String(word.sourceNumber ?? idx + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
                          {word.word}
                        </h3>
                        {word.partOfSpeech && (
                          <span className="text-xs text-slate-500">{word.partOfSpeech}</span>
                        )}
                        {word.cefrLevel && (
                          <span className="text-xs font-mono-num text-slate-500">
                            {word.cefrLevel}
                          </span>
                        )}
                      </div>
                      {!isEditingThis && (
                        <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">Meaning:</span>{' '}
                            {word.banglaMeaning || '—'}
                          </p>
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">Example:</span>{' '}
                            {word.exampleSentence || '—'}
                          </p>
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">বাংলা:</span>{' '}
                            {word.banglaTranslation || '—'}
                          </p>
                          {word.synonyms.length > 0 && (
                            <p>
                              <span className="text-slate-500 dark:text-slate-400">Synonyms:</span>{' '}
                              {word.synonyms
                                .map((s) => (s.meaning ? `${s.term} (${s.meaning})` : s.term))
                                .join(', ')}
                            </p>
                          )}
                          {word.antonyms.length > 0 && (
                            <p>
                              <span className="text-slate-500 dark:text-slate-400">Antonyms:</span>{' '}
                              {word.antonyms
                                .map((a) => (a.meaning ? `${a.term} (${a.meaning})` : a.term))
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingWordIdx(isEditingThis ? null : idx)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        {isEditingThis ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWord(idx)}
                        aria-label={`Remove ${word.word}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditingThis && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Word
                        </label>
                        <input
                          type="text"
                          value={word.word}
                          onChange={(e) => handleUpdateWord(idx, { word: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Part of Speech
                          </label>
                          <input
                            type="text"
                            value={word.partOfSpeech || ''}
                            onChange={(e) =>
                              handleUpdateWord(idx, { partOfSpeech: e.target.value || undefined })
                            }
                            placeholder="e.g. verb"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            CEFR
                          </label>
                          <input
                            type="text"
                            value={word.cefrLevel || ''}
                            onChange={(e) =>
                              handleUpdateWord(idx, {
                                cefrLevel: e.target.value.toUpperCase() || undefined,
                              })
                            }
                            placeholder="e.g. B2"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Bangla Meaning
                        </label>
                        <input
                          type="text"
                          value={word.banglaMeaning}
                          onChange={(e) =>
                            handleUpdateWord(idx, { banglaMeaning: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Example Sentence
                        </label>
                        <input
                          type="text"
                          value={word.exampleSentence}
                          onChange={(e) =>
                            handleUpdateWord(idx, { exampleSentence: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Bangla Translation
                        </label>
                        <input
                          type="text"
                          value={word.banglaTranslation}
                          onChange={(e) =>
                            handleUpdateWord(idx, { banglaTranslation: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Synonyms (comma separated)
                        </label>
                        <input
                          type="text"
                          defaultValue={word.synonyms
                            .map((s) => (s.meaning ? `${s.term} (${s.meaning})` : s.term))
                            .join(', ')}
                          onBlur={(e) =>
                            handleUpdateWord(idx, {
                              synonyms: parseTermMeaningList(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Antonyms (comma separated)
                        </label>
                        <input
                          type="text"
                          defaultValue={word.antonyms
                            .map((a) => (a.meaning ? `${a.term} (${a.meaning})` : a.term))
                            .join(', ')}
                          onBlur={(e) =>
                            handleUpdateWord(idx, {
                              antonyms: parseTermMeaningList(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Story, Bangla Summary, Story Word Review Editors */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
            <div>
              <label
                htmlFor="preview-story"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
              >
                Story
              </label>
              <textarea
                id="preview-story"
                rows={5}
                value={draft.story}
                onChange={(e) => setDraft((prev) => ({ ...prev, story: e.target.value }))}
                className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="preview-bangla-summary"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
              >
                বাংলা সারাংশ (Bangla Story Summary)
              </label>
              <textarea
                id="preview-bangla-summary"
                rows={4}
                value={draft.banglaSummary}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, banglaSummary: e.target.value }))
                }
                className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="preview-word-review"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
              >
                Story Word Review
              </label>
              <textarea
                id="preview-word-review"
                rows={6}
                value={draft.storyWordReviewRaw}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, storyWordReviewRaw: e.target.value }))
                }
                className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={draft.words.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{mode === 'edit' ? 'Save Changes' : 'Save Lesson'}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
