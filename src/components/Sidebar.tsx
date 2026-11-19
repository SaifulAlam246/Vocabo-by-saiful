import React from 'react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenText,
  Brain,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Menu,
  Moon,
  PlusCircle,
  RotateCw,
  Settings,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { AppPage } from '../types/vocab';

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onSetMobileOpen: (open: boolean) => void;
  hidden?: boolean;
  counts: {
    parts: number;
    lessons: number;
    words: number;
    favorites: number;
    dueRevision: number;
  };
}

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.FC<{ className?: string }>;
  count?: number;
  accent?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  theme,
  onToggleTheme,
  mobileOpen,
  onSetMobileOpen,
  hidden = false,
  counts,
}) => {
  if (hidden) return null;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'parts-lessons', label: 'Parts & Lessons', icon: Layers, count: counts.lessons },
    { id: 'library', label: 'Vocabulary Library', icon: BookMarked, count: counts.words },
    { id: 'flashcards', label: 'Flashcards', icon: Brain },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
    { id: 'revision', label: 'Daily Revision', icon: RotateCw, count: counts.dueRevision },
    { id: 'reading', label: 'Reading Mode', icon: BookOpenText },
    { id: 'progress', label: 'Progress Tracker', icon: BarChart3 },
    { id: 'favorites', label: 'Favorites', icon: Star, count: counts.favorites },
    { id: 'add-lesson', label: 'Add New Lesson', icon: PlusCircle, accent: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (page: AppPage) => {
    onNavigate(page);
    onSetMobileOpen(false);
  };

  const renderNavList = () => (
    <nav aria-label="Primary Navigation" className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          currentPage === item.id ||
          (item.id === 'parts-lessons' &&
            (currentPage === 'lesson-detail' || currentPage === 'edit-lesson'));

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : item.accent
                  ? 'text-blue-600 hover:bg-blue-50/70 dark:text-blue-400 dark:hover:bg-slate-800/70'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate whitespace-nowrap">{item.label}</span>
            </span>
            {typeof item.count === 'number' && item.count > 0 && (
              <span className="text-xs font-mono-num tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Compact Top Header */}
      <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between gap-4 px-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onSetMobileOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex items-center justify-center w-10 h-10 -ml-1.5 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate focus-visible:outline-none"
          >
            Vocabo by Saiful
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('add-lesson')}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex no-print" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => onSetMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
                  <BookOpen className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    Vocabo by Saiful
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Learn Words. Build Fluency.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSetMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavList()}

            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-full flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 no-print">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-3 text-left w-full group focus-visible:outline-none"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shrink-0 transition-transform duration-150 group-hover:scale-[1.03]">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 truncate">
                Vocabo by Saiful
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Learn Words. Build Fluency.
              </div>
            </div>
          </button>
        </div>

        {renderNavList()}

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {theme === 'dark' ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
