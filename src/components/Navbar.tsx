import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Sun,
  Moon,
  Library,
  GraduationCap,
  Film,
  BookOpen,
  Bookmark,
  CalendarClock,
} from 'lucide-react';

interface NavbarProps {
  activeView: 'batches' | 'batch-detail' | 'cinema' | 'notes' | 'schedule';
  onNavigate: (view: 'batches' | 'batch-detail' | 'cinema' | 'notes' | 'schedule') => void;
  hasActiveBatch: boolean;
  hasActiveVideo: boolean;
  notesTab: 'notes' | 'bookmarks';
  onOpenNotesTab: (tab: 'notes' | 'bookmarks') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  hasActiveBatch,
  hasActiveVideo,
  notesTab,
  onOpenNotesTab,
  theme,
  onToggleTheme,
}) => {
  // Side navigation slider state (laptop / tablet)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const panelTouchX = useRef(0);

  const navigate = (view: 'batches' | 'batch-detail' | 'cinema' | 'notes' | 'schedule') => {
    setIsDrawerOpen(false);
    onNavigate(view);
  };

  const goEnrolled = () => {
    setIsDrawerOpen(false);
    // Fall back to the catalogue when no batch is open yet
    onNavigate(hasActiveBatch ? 'batch-detail' : 'batches');
  };

  const openNotesTab = (tab: 'notes' | 'bookmarks') => {
    setIsDrawerOpen(false);
    onOpenNotesTab(tab);
  };

  // Lock page scroll while the side slider is open
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDrawerOpen]);

  // Escape closes the side slider
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  // Edge swipe from the left opens the slider (laptop/tablet touch screens)
  useEffect(() => {
    if (isDrawerOpen) return;
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) return;
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0]?.clientX ?? 0;
      if (startX <= 32 && endX - startX > 72) setIsDrawerOpen(true);
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDrawerOpen]);

  // Navigation entries shared by the side slider
  const drawerItems = [
    {
      key: 'batches',
      label: 'Batches Catalogue',
      icon: Library,
      active: activeView === 'batches',
      dim: false,
      disabled: false,
      onClick: () => navigate('batches'),
    },
    {
      key: 'enrolled',
      label: 'Enrolled Curriculum',
      icon: GraduationCap,
      active: activeView === 'batch-detail',
      dim: !hasActiveBatch,
      disabled: false,
      onClick: goEnrolled,
    },
    {
      key: 'cinema',
      label: 'Cinema Player',
      icon: Film,
      active: activeView === 'cinema',
      dim: !hasActiveVideo,
      disabled: !hasActiveVideo,
      onClick: () => navigate('cinema'),
    },
    {
      key: 'study',
      label: 'Study Notes',
      icon: BookOpen,
      active: activeView === 'notes' && notesTab === 'notes',
      dim: false,
      disabled: false,
      onClick: () => openNotesTab('notes'),
    },
    {
      key: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      active: activeView === 'notes' && notesTab === 'bookmarks',
      dim: false,
      disabled: false,
      onClick: () => openNotesTab('bookmarks'),
    },
    ...(hasActiveBatch
      ? [
          {
            key: 'schedule',
            label: 'Batch Schedule',
            icon: CalendarClock,
            active: activeView === 'schedule',
            dim: false,
            disabled: false,
            onClick: () => navigate('schedule'),
          },
        ]
      : []),
  ];

  // Bottom navigation entries (mobile only)
  const bottomItems = [
    {
      key: 'study',
      label: 'Study',
      icon: BookOpen,
      active: activeView === 'notes' && notesTab === 'notes',
      dim: false,
      onClick: () => openNotesTab('notes'),
    },
    {
      key: 'batches',
      label: 'Batches',
      icon: Library,
      active: activeView === 'batches',
      dim: false,
      onClick: () => navigate('batches'),
    },
    {
      key: 'enrolled',
      label: 'Enrolled',
      icon: GraduationCap,
      active: activeView === 'batch-detail',
      dim: !hasActiveBatch,
      onClick: goEnrolled,
    },
    {
      key: 'bookmarks',
      label: 'Bookmarked',
      icon: Bookmark,
      active: activeView === 'notes' && notesTab === 'bookmarks',
      dim: false,
      onClick: () => openNotesTab('bookmarks'),
    },
    // Contextual Cinema entry so an active video is always reachable on mobile
    ...(hasActiveVideo
      ? [
          {
            key: 'cinema',
            label: 'Cinema',
            icon: Film,
            active: activeView === 'cinema',
            dim: false,
            onClick: () => navigate('cinema'),
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--c-header)] backdrop-blur-md border-b border-[var(--c-border)] px-4 md:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => navigate('notes')}
            className="text-[var(--c-heading)] hover:text-[var(--c-accent)] transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            <span className="text-base md:text-lg font-bold tracking-tight">
              Open<span className="text-[var(--c-accent)] font-semibold">Study</span>
            </span>
          </button>

          {/* Zone 2: Theme toggle + Side slider trigger */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Dark / light theme toggle (system mode by default) */}
            <button
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--c-tint)] border border-[var(--c-border)] hover:border-[var(--c-tint-strong)] text-[var(--c-accent)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Hamburger opens the side navigation slider (laptop / tablet) */}
            <button
              onClick={() => setIsDrawerOpen((o) => !o)}
              aria-label="Open navigation menu"
              aria-expanded={isDrawerOpen}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--c-tint)] border border-[var(--c-border)] hover:border-[var(--c-accent)] text-[var(--c-body)] hover:text-[var(--c-heading)] transition-colors cursor-pointer"
            >
              {isDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Side Swipe Navigation Slider (laptop / tablet) ===== */}
      <div aria-hidden={!isDrawerOpen}>
        {/* Backdrop */}
        <div
          onClick={() => setIsDrawerOpen(false)}
          className={`hidden md:block fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Sliding panel */}
        <aside
          onTouchStart={(e) => {
            panelTouchX.current = e.touches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(e) => {
            const dx = (e.changedTouches[0]?.clientX ?? 0) - panelTouchX.current;
            if (dx < -60) setIsDrawerOpen(false); // swipe left to close
          }}
          className={`hidden md:flex fixed left-0 top-0 h-full w-72 z-50 flex-col bg-[var(--c-card)] border-r border-[var(--c-border)] shadow-2xl shadow-[0px_12px_36px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
            isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-accent)] font-semibold">
              Navigation
            </span>
            <button
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-[var(--c-heading)] hover:bg-[var(--c-tint)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {drawerItems.map((item) => {
              const Icon = item.icon;
              const isOff = item.disabled || item.dim;
              return (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  aria-current={item.active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-left transition-colors border ${
                    item.active
                      ? 'bg-[var(--c-tint)] border-[var(--c-tint-strong)] text-[var(--c-accent)]'
                      : 'border-transparent text-[var(--c-body)] hover:bg-[var(--c-tint)] hover:text-[var(--c-heading)]'
                  } ${isOff && !item.active ? 'opacity-40' : ''} ${
                    item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${item.active ? 'text-[var(--c-accent)]' : 'text-[var(--c-disabled)]'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* ===== Bottom Navigation Bar (mobile) ===== */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--c-header)] backdrop-blur-md border-t border-[var(--c-border)] px-1 pt-1.5 flex items-stretch justify-around text-[10px] font-medium text-[var(--c-muted)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
        aria-label="Primary"
      >
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`flex-1 min-w-0 max-w-[84px] flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-lg transition-colors ${
                item.active
                  ? 'text-[var(--c-accent)] bg-[var(--c-tint)]'
                  : item.dim
                  ? 'opacity-40'
                  : 'active:text-[var(--c-body)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
