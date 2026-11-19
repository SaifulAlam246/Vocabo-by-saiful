import React, { useRef, useState } from 'react';
import {
  Download,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { AppSettings, VocabStoreData } from '../types/vocab';
import { exportStoreToJson, validateBackupJson } from '../utils/storage';

interface SettingsViewProps {
  storeData: VocabStoreData;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onImportBackup: (imported: VocabStoreData, mode: 'replace' | 'merge') => void;
  onRestoreSample: () => void;
  onRequestDeleteAll: () => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  storeData,
  onUpdateSettings,
  onImportBackup,
  onRestoreSample,
  onRequestDeleteAll,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<VocabStoreData | null>(null);

  const handleExport = () => {
    const json = exportStoreToJson(storeData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vocabo-by-saiful-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('success', 'Backup JSON downloaded successfully.');
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const validation = validateBackupJson(text);
      if (!validation.valid || !validation.data) {
        onShowToast('error', validation.error || 'Invalid backup file.');
        return;
      }
      setPendingImport(validation.data);
    } catch {
      onShowToast('error', 'Failed to read the selected file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-slate-100">
          Settings &amp; Backup
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Customize your workspace appearance, Part structure, and local backup data.
        </p>
      </div>

      {/* Appearance */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose between Light and Dark theme for comfortable study.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'light' })}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-medium border transition-colors ${
              storeData.settings.theme === 'light'
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ theme: 'dark' })}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-medium border transition-colors ${
              storeData.settings.theme === 'dark'
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark Mode</span>
          </button>
        </div>
      </section>

      {/* Curriculum Structure */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
          Part &amp; Lesson Structure
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          By default, each Part groups 5 Lessons of 10 words each (50 words per Part).
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="lessons-per-part-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Lessons per Part
            </label>
            <input
              id="lessons-per-part-input"
              type="number"
              min={1}
              max={20}
              value={storeData.settings.lessonsPerPart}
              onChange={(e) =>
                onUpdateSettings({
                  lessonsPerPart: Math.max(1, Math.min(20, parseInt(e.target.value || '5', 10))),
                })
              }
              className="w-full px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono-num text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="words-per-lesson-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Default Words per Lesson
            </label>
            <input
              id="words-per-lesson-input"
              type="number"
              min={1}
              max={50}
              value={storeData.settings.wordsPerLesson}
              onChange={(e) =>
                onUpdateSettings({
                  wordsPerLesson: Math.max(1, Math.min(50, parseInt(e.target.value || '10', 10))),
                })
              }
              className="w-full px-3 py-2 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono-num text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Backup & Restore */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
            Backup &amp; Restore
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All lessons, favorites, quiz attempts, and revision progress are stored locally in your
            browser. Export JSON backups regularly to keep your data safe across devices.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export All Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import Backup JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelected}
            className="hidden"
          />

          <button
            type="button"
            onClick={onRestoreSample}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Load Sample Lesson 1.1</span>
          </button>
        </div>

        {pendingImport && (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="text-sm text-slate-800 dark:text-slate-200">
              Backup verified:{' '}
              <span className="font-semibold font-mono-num">{pendingImport.lessons.length}</span>{' '}
              lessons found (
              <span className="font-mono-num">
                {pendingImport.lessons.reduce((s, l) => s + l.words.length, 0)}
              </span>{' '}
              words). Choose how to restore:
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onImportBackup(pendingImport, 'merge');
                  setPendingImport(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Merge with Existing
              </button>
              <button
                type="button"
                onClick={() => {
                  onImportBackup(pendingImport, 'replace');
                  setPendingImport(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700"
              >
                Replace All Data
              </button>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 p-5 sm:p-6">
        <h2 className="font-display font-semibold text-base text-rose-700 dark:text-rose-400">
          Danger Zone
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Permanently delete all saved lessons, favorites, quiz history, and revision progress from
          this browser.
        </p>
        <button
          type="button"
          onClick={onRequestDeleteAll}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete All Data</span>
        </button>
      </section>
    </div>
  );
};
