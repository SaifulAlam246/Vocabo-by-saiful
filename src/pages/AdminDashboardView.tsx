import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookOpenText,
  CheckCircle2,
  Database,
  Download,
  Edit3,
  FolderPlus,
  Layers,
  Plus,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Lesson,
  MigrationConflictMode,
  MigrationReport,
  PartRecord,
  SupabaseSetupStatus,
  VocabStoreData,
  VocabWord,
} from '../types/vocab';
import { groupLessonsIntoParts, sortLessons } from '../utils/numbering';
import { parseStoryWordReview, parseTermMeaningList } from '../utils/lessonParser';
import { exportStoreToJson, validateBackupJson } from '../utils/storage';
import { readLegacyLocalLessons } from '../utils/personalProgress';
import { ConfirmModal } from '../components/ConfirmModal';

interface AdminDashboardViewProps {
  adminEmail: string | null;
  parts: PartRecord[];
  lessons: Lesson[];
  lessonsPerPart: number;
  storeDataForBackup: VocabStoreData;
  syncing: boolean;
  setupStatus?: SupabaseSetupStatus | null;
  onVerifyDatabaseSetup: () => Promise<SupabaseSetupStatus | null>;
  onRefreshFromSupabase: () => Promise<void>;
  onOpenLesson: (lessonId: string) => void;
  onNavigateAddLesson: (preferredPartNumber?: number) => void;
  onEditLesson: (lessonId: string) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onSavePart: (input: {
    id?: string;
    partNumber: number;
    title: string;
    description: string;
  }) => Promise<void>;
  onDeletePart: (partId: string) => Promise<void>;
  onSaveWord: (
    lessonId: string,
    word: VocabWord,
    wordOrder: number,
    isNew: boolean
  ) => Promise<void>;
  onDeleteWord: (lessonId: string, wordId: string) => Promise<void>;
  onSaveStoryAndReview: (
    lessonId: string,
    payload: { story: string; banglaSummary: string; storyWordReviewRaw: string }
  ) => Promise<void>;
  onRunMigration: (
    sourceLessons: Lesson[],
    conflictMode: MigrationConflictMode,
    onProgress: (p: { current: number; total: number; lessonCode: string }) => void
  ) => Promise<MigrationReport>;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

type AdminTab = 'parts-lessons' | 'vocabulary' | 'stories' | 'migration';

const WORDS_PER_ADMIN_PAGE = 50;

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  adminEmail,
  parts,
  lessons,
  lessonsPerPart,
  storeDataForBackup,
  syncing,
  setupStatus,
  onVerifyDatabaseSetup,
  onRefreshFromSupabase,
  onOpenLesson,
  onNavigateAddLesson,
  onEditLesson,
  onDeleteLesson,
  onSavePart,
  onDeletePart,
  onSaveWord,
  onDeleteWord,
  onSaveStoryAndReview,
  onRunMigration,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('parts-lessons');
  const [busy, setBusy] = useState(false);

  // --- Parts CRUD state ---
  const [partFormOpen, setPartFormOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | undefined>(undefined);
  const [partNumberInput, setPartNumberInput] = useState<number>(1);
  const [partTitleInput, setPartTitleInput] = useState<string>('');
  const [partDescInput, setPartDescInput] = useState<string>('');
  const [partToDelete, setPartToDelete] = useState<{
    id: string;
    partNumber: number;
    lessonCount: number;
  } | null>(null);

  // --- Vocabulary Manager state ---
  const [wordQuery, setWordQuery] = useState('');
  const [wordLessonFilter, setWordLessonFilter] = useState<string>('all');
  const [wordPage, setWordPage] = useState(1);
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [wordModalIsNew, setWordModalIsNew] = useState(true);
  const [wordTargetLessonId, setWordTargetLessonId] = useState<string>('');
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [wordOrderInput, setWordOrderInput] = useState<number>(1);
  const [synonymsText, setSynonymsText] = useState('');
  const [antonymsText, setAntonymsText] = useState('');
  const [wordToDelete, setWordToDelete] = useState<{
    lessonId: string;
    wordId: string;
    wordText: string;
  } | null>(null);

  // --- Stories & Reviews state ---
  const sortedLessons = useMemo(() => sortLessons(lessons), [lessons]);
  const [storyLessonId, setStoryLessonId] = useState<string>(() => sortedLessons[0]?.id || '');
  const selectedStoryLesson = useMemo(
    () => sortedLessons.find((l) => l.id === storyLessonId) ?? sortedLessons[0] ?? null,
    [sortedLessons, storyLessonId]
  );
  const [storyText, setStoryText] = useState('');
  const [banglaSummaryText, setBanglaSummaryText] = useState('');
  const [reviewRawText, setReviewRawText] = useState('');
  const [loadedStoryLessonId, setLoadedStoryLessonId] = useState<string>('');

  useEffect(() => {
    if (selectedStoryLesson && selectedStoryLesson.id !== loadedStoryLessonId) {
      setLoadedStoryLessonId(selectedStoryLesson.id);
      setStoryText(selectedStoryLesson.story);
      setBanglaSummaryText(selectedStoryLesson.banglaSummary);
      setReviewRawText(
        selectedStoryLesson.storyWordReviewRaw ||
          selectedStoryLesson.storyWordReview
            .map((r) => {
              const meaning = r.meaning ? ` (${r.meaning})` : '';
              return r.phrase
                ? `- **${r.word}**${meaning} → *${r.phrase}${r.usage ? ':' : ''}* ${r.usage}`
                : `- **${r.word}**${meaning}: ${r.usage}`;
            })
            .join('\n')
      );
    }
  }, [selectedStoryLesson, loadedStoryLessonId]);

  useEffect(() => {
    if (activeTab === 'migration' && !setupStatus) {
      void onVerifyDatabaseSetup();
    }
  }, [activeTab, setupStatus, onVerifyDatabaseSetup]);

  // --- Migration state ---
  const legacyLessons = useMemo(() => readLegacyLocalLessons(), []);
  const [uploadedMigrationLessons, setUploadedMigrationLessons] = useState<Lesson[] | null>(null);
  const [conflictMode, setConflictMode] = useState<MigrationConflictMode>('skip');
  const [migrationProgress, setMigrationProgress] = useState<{
    current: number;
    total: number;
    lessonCode: string;
  } | null>(null);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const migrationFileRef = useRef<HTMLInputElement | null>(null);

  const partSummaries = useMemo(
    () => groupLessonsIntoParts(lessons, lessonsPerPart, parts),
    [lessons, lessonsPerPart, parts]
  );

  const totalWords = useMemo(
    () => lessons.reduce((sum, l) => sum + l.words.length, 0),
    [lessons]
  );

  // Filtered vocabulary words for Admin manager
  const filteredWords = useMemo(() => {
    const q = wordQuery.trim().toLowerCase();
    const list: Array<{ lesson: Lesson; word: VocabWord; order: number }> = [];
    for (const lesson of sortedLessons) {
      if (wordLessonFilter !== 'all' && lesson.id !== wordLessonFilter) continue;
      lesson.words.forEach((word, idx) => {
        if (q) {
          const match =
            word.word.toLowerCase().includes(q) ||
            word.banglaMeaning.toLowerCase().includes(q) ||
            lesson.lessonCode.toLowerCase().includes(q);
          if (!match) return;
        }
        list.push({ lesson, word, order: word.wordOrder ?? idx + 1 });
      });
    }
    return list;
  }, [sortedLessons, wordLessonFilter, wordQuery]);

  const totalWordPages = Math.max(1, Math.ceil(filteredWords.length / WORDS_PER_ADMIN_PAGE));
  const safeWordPage = Math.min(wordPage, totalWordPages);
  const pagedWords = filteredWords.slice(
    (safeWordPage - 1) * WORDS_PER_ADMIN_PAGE,
    safeWordPage * WORDS_PER_ADMIN_PAGE
  );

  const openNewPartForm = () => {
    const maxPart = partSummaries.reduce((m, p) => Math.max(m, p.partNumber), 0);
    const nextNum = maxPart + 1;
    setEditingPartId(undefined);
    setPartNumberInput(nextNum);
    setPartTitleInput(`Part ${nextNum}`);
    setPartDescInput('');
    setPartFormOpen(true);
  };

  const openEditPartForm = (part: (typeof partSummaries)[number]) => {
    setEditingPartId(part.id);
    setPartNumberInput(part.partNumber);
    setPartTitleInput(part.title || `Part ${part.partNumber}`);
    setPartDescInput(part.description || '');
    setPartFormOpen(true);
  };

  const handleSubmitPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSavePart({
        id: editingPartId,
        partNumber: partNumberInput,
        title: partTitleInput,
        description: partDescInput,
      });
      setPartFormOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const openAddWordModal = () => {
    const targetLesson =
      (wordLessonFilter !== 'all' && sortedLessons.find((l) => l.id === wordLessonFilter)) ||
      sortedLessons[0];
    if (!targetLesson) {
      onShowToast('warning', 'Create a lesson first before adding individual words.');
      return;
    }
    setWordModalIsNew(true);
    setWordTargetLessonId(targetLesson.id);
    setWordOrderInput(targetLesson.words.length + 1);
    setEditingWord({
      id: `new_${Date.now()}`,
      word: '',
      partOfSpeech: '',
      cefrLevel: '',
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
    });
    setSynonymsText('');
    setAntonymsText('');
    setWordModalOpen(true);
  };

  const openEditWordModal = (lesson: Lesson, word: VocabWord, order: number) => {
    setWordModalIsNew(false);
    setWordTargetLessonId(lesson.id);
    setWordOrderInput(order);
    setEditingWord({ ...word });
    setSynonymsText(
      word.synonyms.map((s) => (s.meaning ? `${s.term} (${s.meaning})` : s.term)).join(', ')
    );
    setAntonymsText(
      word.antonyms.map((a) => (a.meaning ? `${a.term} (${a.meaning})` : a.term)).join(', ')
    );
    setWordModalOpen(true);
  };

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord || !wordTargetLessonId) return;
    setBusy(true);
    try {
      await onSaveWord(
        wordTargetLessonId,
        {
          ...editingWord,
          synonyms: parseTermMeaningList(synonymsText),
          antonyms: parseTermMeaningList(antonymsText),
        },
        wordOrderInput,
        wordModalIsNew
      );
      setWordModalOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveStoryClick = async () => {
    if (!selectedStoryLesson) return;
    setBusy(true);
    try {
      await onSaveStoryAndReview(selectedStoryLesson.id, {
        story: storyText,
        banglaSummary: banglaSummaryText,
        storyWordReviewRaw: reviewRawText,
      });
    } finally {
      setBusy(false);
    }
  };

  const migrationSourceLessons = uploadedMigrationLessons ?? legacyLessons;
  const migrationSourceStats = useMemo(() => {
    const partSet = new Set(migrationSourceLessons.map((l) => l.partNumber));
    const words = migrationSourceLessons.reduce((sum, l) => sum + l.words.length, 0);
    return { parts: partSet.size, lessons: migrationSourceLessons.length, words };
  }, [migrationSourceLessons]);

  const handleDownloadBackupBeforeMigration = () => {
    const backupSource: VocabStoreData = uploadedMigrationLessons
      ? { ...storeDataForBackup, lessons: uploadedMigrationLessons }
      : { ...storeDataForBackup, lessons: legacyLessons.length > 0 ? legacyLessons : lessons };
    const json = exportStoreToJson(backupSource);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabo-pre-migration-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('success', 'Full JSON backup downloaded.');
  };

  const handleUploadMigrationFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validation = validateBackupJson(text);
      if (!validation.valid || !validation.data) {
        onShowToast('error', validation.error || 'Invalid backup JSON file.');
        return;
      }
      setUploadedMigrationLessons(validation.data.lessons);
      setMigrationReport(null);
      onShowToast(
        'success',
        `Loaded ${validation.data.lessons.length} lessons from backup file for migration.`
      );
    } catch {
      onShowToast('error', 'Failed to read backup file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleStartMigration = async () => {
    if (migrationSourceLessons.length === 0) {
      onShowToast('warning', 'No source lessons detected to migrate.');
      return;
    }
    setBusy(true);
    setMigrationReport(null);
    setMigrationProgress({
      current: 0,
      total: migrationSourceLessons.length,
      lessonCode: migrationSourceLessons[0]?.lessonCode || '1.1',
    });

    try {
      const report = await onRunMigration(migrationSourceLessons, conflictMode, (p) =>
        setMigrationProgress(p)
      );
      setMigrationReport(report);
    } finally {
      setMigrationProgress(null);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Authenticated Admin · {adminEmail || 'Supabase Admin'}</span>
          </div>
          <h1 className="mt-1 font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage shared Parts, Lessons, Vocabulary Words, Stories, Reviews, and Supabase data
            migration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={syncing || busy}
            onClick={() => void onRefreshFromSupabase()}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[42px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Refresh Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateAddLesson()}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Lesson</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Parts</div>
          <div className="mt-2 font-mono-num text-3xl font-bold text-slate-900 dark:text-slate-100">
            {partSummaries.length}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Lessons
          </div>
          <div className="mt-2 font-mono-num text-3xl font-bold text-slate-900 dark:text-slate-100">
            {lessons.length}
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Vocabulary Words
          </div>
          <div className="mt-2 font-mono-num text-3xl font-bold text-blue-600 dark:text-blue-400">
            {totalWords}
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(
          [
            { id: 'parts-lessons', label: 'Parts & Lessons', icon: Layers },
            { id: 'vocabulary', label: 'Manage Vocabulary', icon: BookOpen },
            { id: 'stories', label: 'Stories & Reviews', icon: BookOpenText },
            { id: 'migration', label: 'Migrate Local Data', icon: Database },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PARTS & LESSONS */}
      {activeTab === 'parts-lessons' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
              Parts &amp; Lessons Hierarchy
            </h2>
            <button
              type="button"
              onClick={openNewPartForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add New Part</span>
            </button>
          </div>

          {partFormOpen && (
            <form
              onSubmit={handleSubmitPart}
              className="rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 p-5 space-y-4"
            >
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                {editingPartId ? `Edit Part ${partNumberInput}` : 'Create New Part'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Part Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={partNumberInput}
                    onChange={(e) =>
                      setPartNumberInput(Math.max(1, parseInt(e.target.value || '1', 10)))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono-num"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Part Title
                  </label>
                  <input
                    type="text"
                    required
                    value={partTitleInput}
                    onChange={(e) => setPartTitleInput(e.target.value)}
                    placeholder={`Part ${partNumberInput}`}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={partDescInput}
                    onChange={(e) => setPartDescInput(e.target.value)}
                    placeholder="e.g. Oxford 3000 Core Batch (Words 1–50)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPartFormOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{busy ? 'Saving...' : 'Save Part'}</span>
                </button>
              </div>
            </form>
          )}

          {partSummaries.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No Parts or Lessons in Supabase yet. Add a Part/Lesson or migrate your local data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {partSummaries.map((part) => (
                <section
                  key={part.partNumber}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                        {part.title || `Part ${part.partNumber}`}
                      </h3>
                      {part.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {part.description}
                        </p>
                      )}
                      <div className="mt-1 text-xs font-mono-num text-slate-500 dark:text-slate-400">
                        {part.lessons.length} lessons · {part.totalWords} words
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigateAddLesson(part.partNumber)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Lesson</span>
                      </button>
                      {part.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditPartForm(part)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Part</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPartToDelete({
                                id: part.id!,
                                partNumber: part.partNumber,
                                lessonCount: part.lessons.length,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {part.lessons.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400 italic">
                      No lessons in this Part yet.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                      {part.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenLesson(lesson.id)}
                            className="text-left min-w-0 flex-1 group"
                          >
                            <div className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              Lesson {lesson.lessonCode}{' '}
                              <span className="font-mono-num text-xs font-normal text-slate-400">
                                (Words {lesson.wordRangeStart}–{lesson.wordRangeEnd} ·{' '}
                                {lesson.words.length} entries)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {lesson.words.map((w) => w.word).join(', ')}
                            </p>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditLesson(lesson.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLesson(lesson)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE VOCABULARY */}
      {activeTab === 'vocabulary' && (
        <div className="space-y-4">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={wordQuery}
                  onChange={(e) => {
                    setWordQuery(e.target.value);
                    setWordPage(1);
                  }}
                  placeholder="Search word, Bangla meaning, or lesson code..."
                  className="w-full pl-10 pr-4 py-2 min-h-[40px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
              <select
                value={wordLessonFilter}
                onChange={(e) => {
                  setWordLessonFilter(e.target.value);
                  setWordPage(1);
                }}
                aria-label="Filter vocabulary by lesson"
                className="px-3 py-2 min-h-[40px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
              >
                <option value="all">All Lessons ({sortedLessons.length})</option>
                {sortedLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    Lesson {l.lessonCode} ({l.words.length})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={openAddWordModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vocabulary Word</span>
            </button>
          </section>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {pagedWords.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                No vocabulary words matched your filter.
              </p>
            ) : (
              pagedWords.map(({ lesson, word, order }) => (
                <div
                  key={`${lesson.id}_${word.id}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono-num text-xs text-slate-400">
                        L{lesson.lessonCode} #{order}
                      </span>
                      <span className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                        {word.word}
                      </span>
                      {word.partOfSpeech && (
                        <span className="text-xs text-slate-500">{word.partOfSpeech}</span>
                      )}
                      {word.cefrLevel && (
                        <span className="text-xs font-mono-num text-slate-500">
                          {word.cefrLevel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                      {word.banglaMeaning || '—'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditWordModal(lesson, word, order)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWordToDelete({
                          lessonId: lesson.id,
                          wordId: word.id,
                          wordText: word.word,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalWordPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Page {safeWordPage} of {totalWordPages} ({filteredWords.length} words)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeWordPage <= 1}
                  onClick={() => setWordPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safeWordPage >= totalWordPages}
                  onClick={() => setWordPage((p) => Math.min(totalWordPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STORIES & REVIEWS */}
      {activeTab === 'stories' && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          {sortedLessons.length === 0 ? (
            <p className="text-sm text-slate-500">
              No lessons available yet. Add a lesson first to manage its story and word review.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
                    Manage Story &amp; Word Review
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select a lesson to update its English story, Bangla summary, or Story Word
                    Review directly in Supabase.
                  </p>
                </div>

                <select
                  value={selectedStoryLesson?.id || ''}
                  onChange={(e) => {
                    setStoryLessonId(e.target.value);
                    setLoadedStoryLessonId('');
                  }}
                  aria-label="Select lesson for story management"
                  className="w-full sm:w-64 px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                >
                  {sortedLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      Part {l.partNumber} · Lesson {l.lessonCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Story (English)
                </label>
                <textarea
                  rows={6}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  বাংলা সারাংশ (Bangla Summary)
                </label>
                <textarea
                  rows={4}
                  value={banglaSummaryText}
                  onChange={(e) => setBanglaSummaryText(e.target.value)}
                  className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Story Word Review ({parseStoryWordReview(reviewRawText).length} parsed entries)
                </label>
                <textarea
                  rows={6}
                  value={reviewRawText}
                  onChange={(e) => setReviewRawText(e.target.value)}
                  className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSaveStoryClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{busy ? 'Saving...' : 'Save Story & Review'}</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* TAB 4: MIGRATE LOCAL DATA TO SUPABASE */}
      {activeTab === 'migration' && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
              Safe Local Data Migration to Supabase
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Transfer your existing browser vocabulary library into Supabase without duplicates or
              data loss. Your local browser data is never deleted after migration.
            </p>
          </div>

          {/* Step 0: Database Schema & RLS Verification Gate */}
          <div
            className={`rounded-xl border p-4 space-y-2.5 ${
              setupStatus?.allTablesReady
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                {setupStatus?.allTablesReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span>
                  {setupStatus
                    ? setupStatus.summary
                    : 'Verify Supabase tables and RLS policies before migrating data.'}
                </span>
              </div>
              <button
                type="button"
                disabled={busy || syncing}
                onClick={() => void onVerifyDatabaseSetup()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Verify Schema</span>
              </button>
            </div>
            {setupStatus && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs font-mono">
                {setupStatus.tables.map((t) => (
                  <div key={t.tableName} className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        t.exists ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span className="truncate">{t.tableName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 1: Backup & Source Selection */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Migration Source:{' '}
                  {uploadedMigrationLessons ? 'Uploaded Backup JSON' : 'Browser localStorage'}
                </div>
                <div className="mt-1 font-mono-num text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {migrationSourceStats.parts} Parts · {migrationSourceStats.lessons} Lessons ·{' '}
                  {migrationSourceStats.words} Words
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBackupBeforeMigration}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => migrationFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load Backup JSON Instead</span>
                </button>
                <input
                  ref={migrationFileRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleUploadMigrationFile}
                  className="hidden"
                />

                {uploadedMigrationLessons && (
                  <button
                    type="button"
                    onClick={() => setUploadedMigrationLessons(null)}
                    className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    Use Browser Data
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  If lesson already exists in Supabase:
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="conflictMode"
                    checked={conflictMode === 'skip'}
                    onChange={() => setConflictMode('skip')}
                  />
                  <span>Skip Existing (Recommended, Safe Re-run)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="conflictMode"
                    checked={conflictMode === 'update'}
                    onChange={() => setConflictMode('update')}
                  />
                  <span>Update Existing</span>
                </label>
              </div>

              <button
                type="button"
                disabled={
                  busy ||
                  migrationSourceLessons.length === 0 ||
                  !setupStatus?.allTablesReady
                }
                onClick={handleStartMigration}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>{busy ? 'Migrating...' : 'Migrate Local Data to Supabase'}</span>
              </button>
            </div>
          </div>

          {migrationProgress && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-blue-800 dark:text-blue-200">
                <span>Migrating Lesson {migrationProgress.lessonCode}...</span>
                <span className="font-mono-num">
                  {migrationProgress.current} / {migrationProgress.total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-blue-200 dark:bg-blue-900 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-150"
                  style={{
                    width: `${Math.round(
                      (migrationProgress.current / Math.max(1, migrationProgress.total)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {migrationReport && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2">
                {migrationReport.failedLessons === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
                <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                  Migration Report
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-slate-500">Inserted Lessons</div>
                  <div className="mt-1 font-mono-num text-lg font-bold text-emerald-600">
                    {migrationReport.migratedLessons}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-slate-500">Updated Lessons</div>
                  <div className="mt-1 font-mono-num text-lg font-bold text-blue-600">
                    {migrationReport.updatedLessons}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-slate-500">Skipped Duplicates</div>
                  <div className="mt-1 font-mono-num text-lg font-bold text-slate-600 dark:text-slate-300">
                    {migrationReport.skippedLessons}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-slate-500">Failed Lessons</div>
                  <div className="mt-1 font-mono-num text-lg font-bold text-rose-600">
                    {migrationReport.failedLessons}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                Verified Supabase Database Totals:{' '}
                <span className="font-mono-num font-semibold">
                  {migrationReport.verifiedSupabaseParts} Parts ·{' '}
                  {migrationReport.verifiedSupabaseLessons} Lessons ·{' '}
                  {migrationReport.verifiedSupabaseWords} Vocabulary Words
                </span>
              </div>

              {migrationReport.countMismatchWarning && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 text-xs text-amber-800 dark:text-amber-200">
                  {migrationReport.countMismatchWarning}
                </div>
              )}

              {migrationReport.items.some((i) => i.status === 'failed') && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-rose-600">Failed Records:</div>
                  <ul className="text-xs text-rose-600 space-y-1 list-disc pl-4">
                    {migrationReport.items
                      .filter((i) => i.status === 'failed')
                      .map((i, idx) => (
                        <li key={idx}>
                          Lesson {i.lessonCode}: {i.message}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Word Add / Edit Modal */}
      {wordModalOpen && editingWord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmitWord}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
              {wordModalIsNew ? 'Add Vocabulary Word' : `Edit "${editingWord.word}"`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Lesson</label>
                <select
                  value={wordTargetLessonId}
                  disabled={!wordModalIsNew}
                  onChange={(e) => {
                    const nextLesson = sortedLessons.find((l) => l.id === e.target.value);
                    setWordTargetLessonId(e.target.value);
                    if (nextLesson && wordModalIsNew) {
                      setWordOrderInput(nextLesson.words.length + 1);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                >
                  {sortedLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      Part {l.partNumber} · Lesson {l.lessonCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Word Order in Lesson
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={wordOrderInput}
                  onChange={(e) =>
                    setWordOrderInput(Math.max(1, parseInt(e.target.value || '1', 10)))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  English Word
                </label>
                <input
                  type="text"
                  required
                  value={editingWord.word}
                  onChange={(e) => setEditingWord({ ...editingWord, word: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">POS</label>
                  <input
                    type="text"
                    value={editingWord.partOfSpeech || ''}
                    onChange={(e) =>
                      setEditingWord({ ...editingWord, partOfSpeech: e.target.value })
                    }
                    placeholder="noun"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">CEFR</label>
                  <input
                    type="text"
                    value={editingWord.cefrLevel || ''}
                    onChange={(e) =>
                      setEditingWord({
                        ...editingWord,
                        cefrLevel: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="B2"
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
                  value={editingWord.banglaMeaning}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, banglaMeaning: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  English Example
                </label>
                <input
                  type="text"
                  value={editingWord.exampleSentence}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, exampleSentence: e.target.value })
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
                  value={editingWord.banglaTranslation}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, banglaTranslation: e.target.value })
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
                  value={synonymsText}
                  onChange={(e) => setSynonymsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Antonyms (comma separated)
                </label>
                <input
                  type="text"
                  value={antonymsText}
                  onChange={(e) => setAntonymsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setWordModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save Word'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Part Confirmation */}
      <ConfirmModal
        open={Boolean(partToDelete)}
        title={`Delete Part ${partToDelete?.partNumber ?? ''}?`}
        description={`This will permanently delete Part ${partToDelete?.partNumber ?? ''} and its ${
          partToDelete?.lessonCount ?? 0
        } lessons (including all words, stories, and reviews) from Supabase.`}
        confirmLabel="Delete Part"
        destructive
        onConfirm={async () => {
          if (!partToDelete) return;
          setBusy(true);
          try {
            await onDeletePart(partToDelete.id);
            setPartToDelete(null);
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setPartToDelete(null)}
      />

      {/* Delete Word Confirmation */}
      <ConfirmModal
        open={Boolean(wordToDelete)}
        title={`Delete "${wordToDelete?.wordText ?? ''}"?`}
        description="This will permanently remove this vocabulary word from Supabase."
        confirmLabel="Delete Word"
        destructive
        onConfirm={async () => {
          if (!wordToDelete) return;
          setBusy(true);
          try {
            await onDeleteWord(wordToDelete.lessonId, wordToDelete.wordId);
            setWordToDelete(null);
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setWordToDelete(null)}
      />
    </div>
  );
};
