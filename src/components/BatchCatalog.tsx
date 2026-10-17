import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Sparkles, BookOpen, ChevronRight, CheckCircle2, ArrowRight, Layers, GraduationCap, Filter, ChevronDown, Check } from 'lucide-react';
import { BatchItem } from '../types/pimaxer';
import { buildImageUrl } from '../services/pimaxerApi';

interface BatchCatalogProps {
  batches: BatchItem[];
  totalBatches: number;
  currentPage: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onSelectBatch: (batch: BatchItem) => void;
  enrolledIds: Set<string>;
  onEnrollBatch: (batch: BatchItem) => void;
}

export const BatchCatalog: React.FC<BatchCatalogProps> = ({
  batches,
  totalBatches,
  currentPage,
  isLoading,
  onPageChange,
  onSelectBatch,
  enrolledIds,
  onEnrollBatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close the class filter dropdown on outside click / Escape
  useEffect(() => {
    if (!isFilterOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFilterOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterOpen]);

  const classes = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.class) set.add(b.class);
    });
    return Array.from(set);
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.language && b.language.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesClass = selectedClass === 'all' || b.class === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [batches, searchQuery, selectedClass]);

  // Single filter button options: All Classes + every class present in the catalogue
  const filterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Classes' },
      ...classes.map((c) => ({
        value: c,
        label: c === 'Graduation' ? 'Graduation' : `Class ${c}`,
      })),
    ],
    [classes]
  );

  const filterLabel =
    selectedClass === 'all'
      ? 'Filter: All Classes'
      : selectedClass === 'Graduation'
      ? 'Filter: Graduation'
      : `Filter: Class ${selectedClass}`;

  return (
    <div className="space-y-8 pb-24 md:pb-16">
      {/* Search Bar and Single Filter Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Full-width search bar */}
        <div className="relative flex-1 md:max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batches, exams (JEE, NEET, UPPSC, Boards)..."
            className="w-full pl-11 pr-12 py-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] text-sm text-[var(--c-body)] placeholder-[var(--c-disabled)] focus:outline-none focus:border-[var(--c-primary)] focus:ring-1 focus:ring-[var(--c-tint-strong)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--c-muted)] hover:text-[var(--c-body)] px-2 py-1 rounded-md hover:bg-[var(--c-tint)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Single filter button opening the class dropdown */}
        <div className="relative shrink-0" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={isFilterOpen}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] hover:border-[var(--c-accent)] text-sm font-medium text-[var(--c-body)] transition-colors cursor-pointer"
          >
            <Filter className="w-4 h-4 text-[var(--c-accent)]" />
            <span className="whitespace-nowrap">{filterLabel}</span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--c-muted)] transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isFilterOpen && (
            <div
              role="listbox"
              aria-label="Filter batches by class"
              className="absolute right-0 top-full mt-2 z-30 w-56 p-1.5 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] shadow-2xl shadow-[0px_12px_36px_rgba(0,0,0,0.12)]"
            >
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={selectedClass === opt.value}
                  onClick={() => {
                    setSelectedClass(opt.value);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                    selectedClass === opt.value
                      ? 'bg-[var(--c-tint)] text-[var(--c-accent)] font-semibold'
                      : 'text-[var(--c-body)] hover:bg-[var(--c-tint)] hover:text-[var(--c-heading)]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedClass === opt.value && (
                    <Check className="w-4 h-4 text-[var(--c-accent)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] p-5 h-72 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-32 bg-[var(--c-tint)] rounded-xl" />
                <div className="h-5 bg-[var(--c-tint)] rounded w-3/4" />
                <div className="h-3 bg-[var(--c-tint)] rounded w-1/2" />
              </div>
              <div className="h-8 bg-[var(--c-tint)] rounded-lg mt-4" />
            </div>
          ))}
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[var(--c-surface)] border border-[var(--c-border)] p-8">
          <BookOpen className="w-12 h-12 text-[var(--c-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--c-body)]">No batches matched your filter</h3>
          <p className="text-sm text-[var(--c-muted)] mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or switch to &quot;All Classes&quot; to discover more catalogue offerings.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedClass('all');
            }}
            className="mt-5 px-4 py-2 text-xs font-semibold text-[#ffffff] bg-[var(--c-primary)] rounded-lg hover:bg-[var(--c-primary-hover)] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => {
            const imageUrl = buildImageUrl(batch.previewImage);
            const totalLectures = batch.total_lectures || batch.completed_lectures_count || 0;
            const completedCount = batch.completed_lectures_count || 0;
            const progressPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 100;

            return (
              <div
                key={batch._id}
                className="group flex flex-col justify-between rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-[var(--c-accent)] p-5 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="relative aspect-video rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] overflow-hidden mb-4">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={batch.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Clean fallback container if static image has CORS issue
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--c-tint)] to-[var(--c-card)] p-4 text-center">
                                <span class="text-sm font-semibold text-[var(--c-accent)]">${batch.name}</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--c-tint)] to-[var(--c-card)] p-4 text-center">
                        <span className="text-sm font-semibold text-[var(--c-accent)]">{batch.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Clean unboxed metadata with separators */}
                  <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] font-mono mb-2">
                    <span>Class {batch.class || 'N/A'}</span>
                    <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
                    <span>{batch.language || 'Hinglish'}</span>
                    <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
                    <span className="tabular-nums">{totalLectures} Lectures</span>
                  </div>

                  {/* Batch Title */}
                  <h3 className="text-base font-semibold text-[var(--c-heading)] group-hover:text-[var(--c-accent)] transition-colors line-clamp-2">
                    {batch.name}
                  </h3>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[var(--c-muted)]">
                      <span>Curriculum Status</span>
                      <span className="text-[var(--c-accent)] font-mono tabular-nums">{progressPercent}% Ready</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--c-surface)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#5a4bda] to-[#7363fc] rounded-full"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-5 pt-4 border-t border-[var(--c-border)] flex items-center justify-between gap-3">
                  <button
                    onClick={() => onSelectBatch(batch)}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-[var(--c-tint)] hover:bg-[var(--c-primary)] text-[var(--c-accent)] hover:text-[#ffffff] border border-[var(--c-tint-strong)] hover:border-[var(--c-primary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Curriculum</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {enrolledIds.has(batch._id) ? (
                    <span
                      title="Already enrolled"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--c-tint)] text-[var(--c-accent)] border border-[var(--c-tint-strong)]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Enrolled</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onEnrollBatch(batch)}
                      title="Enroll in this batch"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[#ffffff] transition-colors cursor-pointer shadow-sm"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Enroll</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 pt-6 border-t border-[var(--c-border)] text-xs text-[var(--c-muted)]">
        <div>
          Showing page <span className="text-[var(--c-heading)] font-mono tabular-nums">{currentPage}</span> of catalogue
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1 || isLoading}
            className="px-4 py-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-accent)] text-[var(--c-body)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={batches.length < 50 || isLoading}
            className="px-4 py-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-accent)] text-[var(--c-body)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
