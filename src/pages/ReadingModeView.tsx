import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { Lesson, VocabWord } from '../types/vocab';
import { sortLessons } from '../utils/numbering';
import { parseStoryWordReview } from '../utils/lessonParser';

interface ReadingModeViewProps {
  lessons: Lesson[];
  initialLessonId?: string;
  focusMode: boolean;
  onToggleFocusMode: (focus: boolean) => void;
  onMarkStoryCompleted: (lessonId: string) => void;
  onNavigateAddLesson: () => void;
}

type FontSizeOption = 'sm' | 'md' | 'lg' | 'xl';
type LineSpacingOption = 'compact' | 'comfortable' | 'relaxed';
type ReadingThemeOption = 'auto' | 'light' | 'sepia' | 'dark';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const ReadingModeView: React.FC<ReadingModeViewProps> = ({
  lessons,
  initialLessonId,
  focusMode,
  onToggleFocusMode,
  onMarkStoryCompleted,
  onNavigateAddLesson,
}) => {
  const sortedLessons = useMemo(() => sortLessons(lessons), [lessons]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    if (initialLessonId && sortedLessons.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    return sortedLessons[0]?.id || '';
  });

  const [fontSize, setFontSize] = useState<FontSizeOption>('lg');
  const [lineSpacing, setLineSpacing] = useState<LineSpacingOption>('comfortable');
  const [readingTheme, setReadingTheme] = useState<ReadingThemeOption>('auto');
  const [highlightVocab, setHighlightVocab] = useState(true);
  const [showInlineBangla, setShowInlineBangla] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'full' | 'paragraph'>('full');
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [showBanglaSummary, setShowBanglaSummary] = useState(true);
  const [showWordReview, setShowWordReview] = useState(true);
  const [inspectedWord, setInspectedWord] = useState<VocabWord | null>(null);

  // Optional Browser-Native Speech Synthesis
  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!speechSupported) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const english = available.filter((v) => v.lang.toLowerCase().startsWith('en'));
      const list = english.length > 0 ? english : available;
      setVoices(list);
      if (list.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(list[0].voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [speechSupported, selectedVoiceURI]);

  // Sync if selected lesson was deleted or changed
  useEffect(() => {
    if (sortedLessons.length > 0 && !sortedLessons.some((l) => l.id === selectedLessonId)) {
      setSelectedLessonId(sortedLessons[0].id);
    }
  }, [sortedLessons, selectedLessonId]);

  const currentIdx = sortedLessons.findIndex((l) => l.id === selectedLessonId);
  const currentLesson = currentIdx >= 0 ? sortedLessons[currentIdx] : sortedLessons[0];
  const prevStoryLesson = currentIdx > 0 ? sortedLessons[currentIdx - 1] : null;
  const nextStoryLesson =
    currentIdx >= 0 && currentIdx < sortedLessons.length - 1
      ? sortedLessons[currentIdx + 1]
      : null;

  // Split story into readable paragraphs (or sentences if single block) for Paragraph Practice
  const paragraphs = useMemo(() => {
    if (!currentLesson?.story) return [];
    const byNewline = currentLesson.story
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (byNewline.length > 1) return byNewline;

    // If story is a single paragraph, split cleanly into 2-sentence chunks for Practice Mode
    const raw = byNewline[0] || '';
    const sentences = raw.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [raw];
    if (sentences.length <= 2) return [raw];
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2).join('').trim());
    }
    return chunks.filter(Boolean);
  }, [currentLesson]);

  useEffect(() => {
    setParagraphIndex(0);
    setInspectedWord(null);
    if (speechSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [selectedLessonId, speechSupported]);

  const handleToggleSpeech = () => {
    if (!speechSupported || !currentLesson?.story) return;

    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak =
      practiceMode === 'paragraph'
        ? (paragraphs[paragraphIndex] || '').replace(/\*\*/g, '')
        : currentLesson.story.replace(/\*\*/g, '');

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (chosenVoice) utterance.voice = chosenVoice;
    utterance.rate = speechRate;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const findMatchingWord = (token: string): VocabWord | undefined => {
    if (!currentLesson) return undefined;
    const lower = token.toLowerCase();
    return currentLesson.words.find((w) => {
      const target = w.word.trim().toLowerCase();
      if (!target) return false;
      return (
        lower === target ||
        (lower.startsWith(target) &&
          ['s', 'es', 'ed', 'd', 'ing', 'ly'].includes(lower.slice(target.length)))
      );
    });
  };

  const renderInteractiveParagraph = (text: string) => {
    if (!currentLesson) return null;
    const vocabTerms = currentLesson.words
      .map((w) => w.word.trim())
      .filter((w) => w.length >= 2)
      .sort((a, b) => b.length - a.length);

    const boldSegments = text.split(/(\*\*[^*]+\*\*)/g);

    return boldSegments.map((seg, sIdx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        const inner = seg.slice(2, -2);
        const matched = findMatchingWord(inner);
        if (!highlightVocab) {
          return <React.Fragment key={sIdx}>{inner}</React.Fragment>;
        }
        return (
          <React.Fragment key={sIdx}>
            <button
              type="button"
              onClick={() => matched && setInspectedWord(matched)}
              className={`inline font-semibold px-1 py-0.5 rounded transition-colors ${
                matched
                  ? 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer'
                  : 'bg-blue-100/80 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200'
              }`}
            >
              {inner}
            </button>
            {showInlineBangla && matched?.banglaMeaning && (
              <span className="text-[0.8em] text-emerald-700 dark:text-emerald-300 font-medium mx-1">
                ({matched.banglaMeaning})
              </span>
            )}
          </React.Fragment>
        );
      }

      if (!highlightVocab || vocabTerms.length === 0) {
        return <React.Fragment key={sIdx}>{seg}</React.Fragment>;
      }

      const pattern = new RegExp(
        `\\b(${vocabTerms.map(escapeRegExp).join('|')})(?:s|es|ed|d|ing|ly)?\\b`,
        'gi'
      );
      const parts = seg.split(pattern);

      return (
        <React.Fragment key={sIdx}>
          {parts.map((part, i) => {
            const matched = findMatchingWord(part);
            if (matched) {
              return (
                <React.Fragment key={i}>
                  <button
                    type="button"
                    onClick={() => setInspectedWord(matched)}
                    className="inline font-semibold px-1 py-0.5 rounded bg-blue-100/90 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer transition-colors"
                  >
                    {part}
                  </button>
                  {showInlineBangla && matched.banglaMeaning && (
                    <span className="text-[0.8em] text-emerald-700 dark:text-emerald-300 font-medium mx-1">
                      ({matched.banglaMeaning})
                    </span>
                  )}
                </React.Fragment>
              );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
          })}
        </React.Fragment>
      );
    });
  };

  const fontSizeClass = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl sm:text-[22px]',
    xl: 'text-2xl sm:text-[26px]',
  }[fontSize];

  const lineSpacingClass = {
    compact: 'leading-[1.6]',
    comfortable: 'leading-[1.85]',
    relaxed: 'leading-[2.15]',
  }[lineSpacing];

  const paperThemeClass = {
    auto: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200',
    light: 'bg-white border-slate-200 text-slate-900',
    sepia: 'bg-[#FBF7EE] border-[#E8DEC8] text-[#2C2416]',
    dark: 'bg-slate-950 border-slate-800 text-slate-100',
  }[readingTheme];

  const readingProgressPct =
    practiceMode === 'paragraph' && paragraphs.length > 0
      ? Math.round(((paragraphIndex + 1) / paragraphs.length) * 100)
      : currentLesson?.storyCompleted
        ? 100
        : 50;

  return (
    <div className={`space-y-6 ${focusMode ? 'max-w-3xl mx-auto py-2' : 'max-w-4xl mx-auto'}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
            Reading Mode
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Read lesson stories comfortably. Tap any highlighted vocabulary word to see its meaning.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleFocusMode(!focusMode)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{focusMode ? 'Exit Focus Mode' : 'Focus Mode'}</span>
        </button>
      </div>

      {!currentLesson ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <BookOpenText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            No Stories Available Yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add a lesson with a story to practice reading fluency.
          </p>
          <button
            type="button"
            onClick={onNavigateAddLesson}
            className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Add New Lesson
          </button>
        </div>
      ) : (
        <>
          {/* Story Selector & Reading Controls Toolbar */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <select
                value={currentLesson.id}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                aria-label="Choose Story Lesson"
                className="w-full sm:w-80 px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                {sortedLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    Part {l.partNumber} · Lesson {l.lessonCode} (Words {l.wordRangeStart}–
                    {l.wordRangeEnd})
                    {l.storyCompleted ? ' ✓' : ''}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setPracticeMode('full')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    practiceMode === 'full'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Full Story
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPracticeMode('paragraph');
                    setParagraphIndex(0);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    practiceMode === 'paragraph'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Paragraph Practice
                </button>
              </div>
            </div>

            {/* Typography & Display Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Font Size */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400 mr-1">Font:</span>
                {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`px-2.5 py-1.5 rounded-md font-mono-num uppercase ${
                      fontSize === sz
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {/* Line Spacing */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400 mr-1">Spacing:</span>
                {(['compact', 'comfortable', 'relaxed'] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setLineSpacing(sp)}
                    className={`px-2.5 py-1.5 rounded-md capitalize ${
                      lineSpacing === sp
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>

              {/* Reading Theme */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400 mr-1">Theme:</span>
                {(['auto', 'light', 'sepia', 'dark'] as const).map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setReadingTheme(th)}
                    className={`px-2.5 py-1.5 rounded-md capitalize ${
                      readingTheme === th
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlight & Bangla Gloss & Optional Speech Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHighlightVocab((h) => !h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    highlightVocab
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {highlightVocab ? 'Highlights: On' : 'Highlights: Off'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowInlineBangla((b) => !b)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    showInlineBangla
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {showInlineBangla ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Inline Bangla Meanings</span>
                </button>
              </div>

              {/* Optional Browser Native Speech Synthesis */}
              {speechSupported && currentLesson.story && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSpeech}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    {isSpeaking && !isPaused ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{isPaused ? 'Resume' : 'Listen'}</span>
                      </>
                    )}
                  </button>

                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={handleStopSpeech}
                      aria-label="Stop reading"
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {voices.length > 0 && (
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
                      aria-label="Select speech voice"
                      className="max-w-[140px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
                    >
                      {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={speechRate}
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                    aria-label="Speech speed"
                    className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono-num text-slate-700 dark:text-slate-200"
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Reading Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono-num text-slate-500 dark:text-slate-400">
              <span>
                {practiceMode === 'paragraph' && paragraphs.length > 0
                  ? `Paragraph ${paragraphIndex + 1} of ${paragraphs.length}`
                  : `Lesson ${currentLesson.lessonCode} Story`}
              </span>
              <span>{currentLesson.storyCompleted ? 'Story Completed' : `${readingProgressPct}%`}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${readingProgressPct}%` }}
              />
            </div>
          </div>

          {/* Story Paper Surface */}
          <article className={`rounded-2xl border p-6 sm:p-10 transition-colors ${paperThemeClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-current/10">
              <div>
                <div className="text-xs font-mono-num opacity-70">
                  Part {currentLesson.partNumber} · Lesson {currentLesson.lessonCode}
                </div>
                <h2 className="font-display font-bold text-xl sm:text-2xl mt-0.5">
                  Story Reading
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onMarkStoryCompleted(currentLesson.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  currentLesson.storyCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {currentLesson.storyCompleted ? 'Story Completed' : 'Mark Story Completed'}
                </span>
              </button>
            </div>

            {!currentLesson.story ? (
              <p className="text-sm opacity-70 italic">No story text saved for this lesson.</p>
            ) : practiceMode === 'paragraph' ? (
              <div className="space-y-8">
                <p className={`${fontSizeClass} ${lineSpacingClass}`}>
                  {renderInteractiveParagraph(paragraphs[paragraphIndex] || '')}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-current/10">
                  <button
                    type="button"
                    disabled={paragraphIndex === 0}
                    onClick={() => setParagraphIndex((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-medium border border-current/20 disabled:opacity-35"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous Paragraph</span>
                  </button>

                  <button
                    type="button"
                    disabled={paragraphIndex + 1 >= paragraphs.length}
                    onClick={() =>
                      setParagraphIndex((i) => Math.min(paragraphs.length - 1, i + 1))
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-35"
                  >
                    <span>Next Paragraph</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className={`space-y-5 ${fontSizeClass} ${lineSpacingClass}`}>
                {paragraphs.map((p, idx) => (
                  <p key={idx}>{renderInteractiveParagraph(p)}</p>
                ))}
              </div>
            )}
          </article>

          {/* Clicked Highlighted Word Popover Panel */}
          {inspectedWord && (
            <section
              role="region"
              aria-label="Selected vocabulary word details"
              className="rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 p-5 shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">
                      {inspectedWord.word}
                    </h3>
                    {inspectedWord.partOfSpeech && (
                      <span className="text-xs text-slate-500">{inspectedWord.partOfSpeech}</span>
                    )}
                    {inspectedWord.cefrLevel && (
                      <span className="text-xs font-mono-num text-slate-500">
                        {inspectedWord.cefrLevel}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-base font-medium text-blue-700 dark:text-blue-300">
                    {inspectedWord.banglaMeaning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedWord(null)}
                  aria-label="Close word details"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {inspectedWord.exampleSentence && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                  <p>{inspectedWord.exampleSentence}</p>
                  {inspectedWord.banglaTranslation && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {inspectedWord.banglaTranslation}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Bangla Summary & Story Word Review (Separate Sections) */}
          <div className="space-y-4">
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                  বাংলা সারাংশ (Bangla Summary)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBanglaSummary((s) => !s)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showBanglaSummary ? 'Hide' : 'Show'}
                </button>
              </div>
              {showBanglaSummary && (
                <p className="mt-3 text-base leading-[1.8] text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {currentLesson.banglaSummary || 'No Bangla summary provided.'}
                </p>
              )}
            </section>

            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                  Story Word Review
                </h3>
                <button
                  type="button"
                  onClick={() => setShowWordReview((s) => !s)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showWordReview ? 'Hide' : 'Show'}
                </button>
              </div>
              {showWordReview && (
                <div className="mt-3">
                  {(() => {
                    const reviewItems =
                      currentLesson.storyWordReviewRaw &&
                      currentLesson.storyWordReviewRaw.trim()
                        ? parseStoryWordReview(currentLesson.storyWordReviewRaw)
                        : currentLesson.storyWordReview;

                    if (reviewItems.length > 0) {
                      return (
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {reviewItems.map((item, idx) => (
                            <li key={item.id || idx} className="pl-1">
                              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.word}
                              </strong>
                              {item.meaning && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  {' '}
                                  ({item.meaning})
                                </span>
                              )}
                              {item.phrase ? (
                                <>
                                  {' '}
                                  <span aria-hidden="true">→</span>{' '}
                                  <em className="italic text-slate-800 dark:text-slate-200">
                                    {item.phrase}
                                    {item.usage ? ':' : ''}
                                  </em>
                                  {item.usage ? <span> {item.usage}</span> : null}
                                </>
                              ) : item.usage ? (
                                <span>: {item.usage}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <p className="text-sm text-slate-500 py-2">
                        No Story Word Review provided.
                      </p>
                    );
                  })()}
                </div>
              )}
            </section>
          </div>

          {/* Previous / Next Story Navigation */}
          <nav
            aria-label="Story navigation"
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
          >
            {prevStoryLesson ? (
              <button
                type="button"
                onClick={() => setSelectedLessonId(prevStoryLesson.id)}
                className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Story · Lesson {prevStoryLesson.lessonCode}</span>
              </button>
            ) : (
              <div />
            )}

            {nextStoryLesson && (
              <button
                type="button"
                onClick={() => setSelectedLessonId(nextStoryLesson.id)}
                className="inline-flex items-center justify-end gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span>Next Story · Lesson {nextStoryLesson.lessonCode}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </nav>

          {speechSupported && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Browser speech synthesis enabled when available on your device.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
