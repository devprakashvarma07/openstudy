import React, { useState, useEffect, Component } from 'react';

// Error boundary to catch render crashes
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-lg font-semibold text-red-500">Something went wrong</h2>
          <p className="text-sm text-gray-500 mt-2">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  ArrowLeft,
  BookOpen,
  UserCheck,
  Play,
  CheckCircle2,
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import {
  BatchItem,
  BatchSubject,
  ScheduleSubjectItem,
  TopicItem,
  ContentLectureItem,
  TeacherInfo,
} from '../types/pimaxer';
import {
  fetchBatchSubjects,
  fetchBatchSchedule,
  fetchSubjectTopics,
  fetchSubjectContents,
  buildImageUrl,
  getStreamUrl,
} from '../services/pimaxerApi';

interface BatchDetailProps {
  batch: BatchItem;
  onBack: () => void;
  onPlayLecture: (lecture: ContentLectureItem, subjectName: string) => void;
  completedLectures: Set<string>;
  onToggleComplete: (lectureId: string) => void;
  bookmarkedLectures: Set<string>;
  onToggleBookmark: (lecture: ContentLectureItem, subjectName: string) => void;
}

export const BatchDetail: React.FC<BatchDetailProps> = ({
  batch,
  onBack,
  onPlayLecture,
  completedLectures,
  onToggleComplete,
  bookmarkedLectures,
  onToggleBookmark,
}) => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'faculty' | 'schedule'>('subjects');
  const [subjects, setSubjects] = useState<BatchSubject[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleSubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded subject and its contents
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [contents, setContents] = useState<ContentLectureItem[]>([]);
  const [isContentsLoading, setIsContentsLoading] = useState(false);
  const [contentSearch, setContentSearch] = useState('');

  // Mobile drill-down flow: Subject -> Chapters -> Lectures
  const [mobileStep, setMobileStep] = useState<'subjects' | 'chapters' | 'lectures'>('subjects');
  const [mobileTopic, setMobileTopic] = useState<{ name: string; slug?: string } | null>(null);

  // Load batch subjects & schedule
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [subjs, sched] = await Promise.all([
          fetchBatchSubjects(batch._id),
          fetchBatchSchedule(batch._id),
        ]);
        if (isMounted) {
          setSubjects(subjs);
          setScheduleItems(sched);
        }
      } catch (err) {
        console.error('Failed to load batch subjects/schedule:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [batch._id]);

  // Load subject contents when selectedSubjectId changes
  useEffect(() => {
    if (!selectedSubjectId) return;
    let isMounted = true;
    async function loadContents() {
      setIsContentsLoading(true);
      try {
        const [top, cont] = await Promise.all([
          fetchSubjectTopics(batch._id, selectedSubjectId!),
          fetchSubjectContents(batch._id, selectedSubjectId!),
        ]);
        if (isMounted) {
          setTopics(top);
          setContents(cont);
        }
      } catch (err) {
        console.error('Failed to load subject contents:', err);
      } finally {
        if (isMounted) setIsContentsLoading(false);
      }
    }
    loadContents();
    return () => {
      isMounted = false;
    };
  }, [batch._id, selectedSubjectId]);

  // Early return if batch data is incomplete
  if (!batch || !batch._id || !batch.name) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-semibold">Batch data unavailable</h2>
        <button onClick={onBack} className="mt-4 px-4 py-2 text-sm rounded-lg bg-[var(--c-primary)] text-white">Go Back</button>
      </div>
    );
  }

  const activeSubject = subjects.find((s) => s.subjectId === selectedSubjectId);
  const activeSubjectName = activeSubject?.subjectName || 'Curriculum Subject';

  // Extract all faculty teachers across schedule
  const allTeachers: TeacherInfo[] = React.useMemo(() => {
    const map = new Map<string, TeacherInfo>();
    (scheduleItems || []).forEach((item) => {
      item.teacherIds?.forEach((t) => {
        if (t._id && !map.has(t._id)) {
          map.set(t._id, t);
        }
      });
    });
    return Array.from(map.values());
  }, [scheduleItems]);

  const filteredContents = contents.filter((c) =>
    c.topic.toLowerCase().includes(contentSearch.toLowerCase())
  );

  // The gateway returns a single catch-all All Lectures chapter per subject,
  // and no lecture title contains that phrase - treat it as show-everything.
  const isCatchAllTopic = (name: string, slug?: string) =>
    slug === 'all-lectures' || name.trim().toLowerCase() === 'all lectures';

  const lecturesForTopic = (name: string, slug?: string): ContentLectureItem[] =>
    isCatchAllTopic(name, slug)
      ? contents
      : contents.filter((c) => c.topic?.toLowerCase().includes(name.toLowerCase()));

  // Lectures for the chosen chapter in the mobile drill-down flow
  const mobileLectures = (
    mobileTopic ? lecturesForTopic(mobileTopic.name, mobileTopic.slug) : []
  ).filter((c) => c.topic.toLowerCase().includes(contentSearch.toLowerCase()));

  return (
    <ErrorBoundary>
    <div className="space-y-6 pb-20">
      {/* Back button and Batch Banner */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-accent)] text-[var(--c-body)] hover:text-[var(--c-heading)] text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Batches</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-6 md:p-8 relative overflow-hidden">
        <div className="max-w-4xl space-y-3">
          <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] font-mono">
            <span>Class {batch.class || 'N/A'}</span>
            <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
            <span>{batch.language || 'Hinglish'}</span>
            <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
            <span className="tabular-nums">{batch.total_lectures || 0} Lectures Scheduled</span>
            <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
            <span className="text-[var(--c-accent)]">Stream Online</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-[var(--c-heading)] tracking-tight">
            {batch.name}
          </h1>
        </div>

        {/* Navigation Tabs for Batch View */}
        <div className="mt-8 pt-4 border-t border-[var(--c-border)] flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'subjects'
                ? 'bg-[var(--c-primary)] text-[#ffffff] shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-body)] hover:bg-[var(--c-tint)]'
            }`}
          >
            Subject Modules ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('faculty')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'faculty'
                ? 'bg-[var(--c-primary)] text-[#ffffff] shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-body)] hover:bg-[var(--c-tint)]'
            }`}
          >
            Faculty Mentors ({allTeachers.length})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-[var(--c-primary)] text-[#ffffff] shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-body)] hover:bg-[var(--c-tint)]'
            }`}
          >
            Syllabus Breakdown ({(scheduleItems || []).length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="p-12 text-center text-[var(--c-muted)] rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] animate-pulse">
          Loading curriculum syllabus...
        </div>
      ) : activeTab === 'subjects' ? (
        <>
          {/* Desktop (laptop): subject selector beside lectures */}
          <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Subject Module Selector */}
          <div className="lg:col-span-4 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-4 space-y-2">
            <div className="text-xs font-mono text-[var(--c-muted)] uppercase tracking-wider px-2 py-1">
              Course Modules
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {subjects.map((subj) => {
                const isSelected = subj.subjectId === selectedSubjectId;
                const isNotice = subj.status === 'Invisible' || subj.subjectName.toLowerCase().includes('notice');

                return (
                  <button
                    key={subj._id}
                    onClick={() => setSelectedSubjectId(subj.subjectId)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--c-tint)] border-[var(--c-tint-strong)] text-[var(--c-accent)]'
                        : 'border-transparent text-[var(--c-body)] hover:bg-[var(--c-tint)] hover:text-[var(--c-heading)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <BookOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--c-accent)]' : 'text-[var(--c-disabled)]'}`} />
                      <span className="text-xs font-medium truncate">{subj.subjectName}</span>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-[var(--c-accent)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Lectures & Topic Contents */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--c-border)]">
                <div>
                  <h2 className="text-lg font-bold text-[var(--c-heading)]">{activeSubjectName}</h2>
                  <p className="text-xs text-[var(--c-muted)] mt-0.5 font-mono">
                    {contents.length} Recorded lectures and test review sessions
                  </p>
                </div>

                {/* Filter lectures inside subject */}
                <input
                  type="text"
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  placeholder="Filter lectures by chapter..."
                  className="px-3 py-1.5 rounded-lg bg-[var(--c-card)] border border-[var(--c-border)] text-xs text-[var(--c-body)] placeholder-[var(--c-disabled)] focus:outline-none focus:border-[var(--c-primary)]"
                />
              </div>

              {/* Lecture list */}
              {isContentsLoading ? (
                <div className="py-16 text-center text-[var(--c-muted)] text-xs animate-pulse">
                  Loading lectures...
                </div>
              ) : filteredContents.length === 0 ? (
                <div className="py-12 text-center text-[var(--c-disabled)] text-xs">
                  No lectures found matching &quot;{contentSearch}&quot;.
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                  {filteredContents.map((lecture, index) => {
                    const isCompleted = completedLectures.has(lecture._id);
                    const isBookmarked = bookmarkedLectures.has(lecture._id);

                    return (
                      <div
                        key={lecture._id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCompleted
                            ? 'bg-[var(--c-card)] border-[var(--c-border)] opacity-80'
                            : 'bg-[var(--c-card)] border-[var(--c-border)] hover:border-[var(--c-accent)]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => onToggleComplete(lecture._id)}
                            title={isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                            className="mt-0.5 text-[var(--c-disabled)] hover:text-[var(--c-success)] transition-colors cursor-pointer shrink-0"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${isCompleted ? 'text-[var(--c-success)] fill-[#adcfb7]' : ''}`}
                            />
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] font-mono">
                              <span className="text-[var(--c-accent)] font-semibold">Lecture {index + 1}</span>
                              <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
                              <span className="text-[var(--c-muted)]">Stream Ready</span>
                            </div>
                            <h4 className="text-xs font-medium text-[var(--c-body)] hover:text-[var(--c-accent)] transition-colors leading-relaxed line-clamp-2">
                              {lecture.topic}
                            </h4>
                          </div>
                        </div>

                        {/* Actions: Stream & Bookmark */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => onToggleBookmark(lecture, activeSubjectName)}
                            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark for Revision'}
                            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'bg-[#eaaa2e]/10 border-[#eaaa2e]/40 text-[#eaaa2e]'
                                : 'border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-body)] hover:bg-[var(--c-tint)]'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#eaaa2e]' : ''}`} />
                          </button>

                          <button
                            onClick={() => onPlayLecture(lecture, activeSubjectName)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[#ffffff] font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Play Lecture</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: step-by-step drill-down — Subject -> Chapters -> Lectures */}
        <div className="lg:hidden space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
            <span className={mobileStep === 'subjects' ? 'text-[var(--c-accent)] font-semibold' : ''}>
              Subject
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className={mobileStep === 'chapters' ? 'text-[var(--c-accent)] font-semibold' : ''}>
              Chapters
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className={mobileStep === 'lectures' ? 'text-[var(--c-accent)] font-semibold' : ''}>
              Lectures
            </span>
          </div>

          {/* Step 1: choose subject */}
          {mobileStep === 'subjects' && (
            <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-4 space-y-2">
              <div className="text-xs font-mono text-[var(--c-muted)] uppercase tracking-wider px-2 py-1">
                Choose Subject
              </div>
              {isLoading ? (
                <div className="py-10 text-center text-[var(--c-muted)] text-xs animate-pulse">
                  Loading subjects...
                </div>
              ) : (
                subjects.map((subj) => (
                  <button
                    key={subj._id}
                    onClick={() => {
                      setSelectedSubjectId(subj.subjectId);
                      setContentSearch('');
                      setMobileTopic(null);
                      setMobileStep('chapters');
                    }}
                    className="w-full text-left p-3.5 rounded-xl border border-[var(--c-border)] hover:border-[var(--c-tint-strong)] hover:bg-[var(--c-tint)] transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 truncate min-w-0">
                      <BookOpen className="w-4 h-4 shrink-0 text-[var(--c-accent)]" />
                      <span className="text-sm font-medium text-[var(--c-heading)] truncate">
                        {subj.subjectName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--c-disabled)] shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: choose chapter of the subject */}
          {mobileStep === 'chapters' && (
            <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-4 space-y-2">
              <button
                onClick={() => setMobileStep('subjects')}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors cursor-pointer px-1 py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Subjects
              </button>

              <div className="px-2 pt-1">
                <div className="text-sm font-bold text-[var(--c-heading)]">{activeSubjectName}</div>
                <div className="text-[11px] font-mono text-[var(--c-muted)] mt-0.5">
                  {topics.length} {topics.length === 1 ? 'Chapter' : 'Chapters'}
                </div>
              </div>

              {isContentsLoading ? (
                <div className="py-10 text-center text-[var(--c-muted)] text-xs animate-pulse">
                  Loading chapters...
                </div>
              ) : topics.length === 0 ? (
                <div className="py-8 text-center text-[var(--c-disabled)] text-xs">
                  No chapters found for this subject.
                </div>
              ) : (
                topics.map((topic, topicIdx) => {
                  const lectureCount = lecturesForTopic(topic.name, topic.slug).length;
                  return (
                    <button
                      key={topic._id}
                      onClick={() => {
                        setMobileTopic({ name: topic.name, slug: topic.slug });
                        setContentSearch('');
                        setMobileStep('lectures');
                      }}
                      className="w-full text-left p-3.5 rounded-xl border border-[var(--c-border)] hover:border-[var(--c-tint-strong)] hover:bg-[var(--c-tint)] transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 truncate min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[var(--c-tint)] text-[var(--c-accent)] text-[11px] font-bold flex items-center justify-center shrink-0">
                          {topicIdx + 1}
                        </span>
                        <span className="text-sm font-medium text-[var(--c-heading)] truncate">
                          {topic.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--c-muted)] shrink-0 tabular-nums">
                        {lectureCount} Lect.
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Step 3: lectures of the chosen chapter */}
          {mobileStep === 'lectures' && (
            <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-4 space-y-3">
              <button
                onClick={() => setMobileStep('chapters')}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors cursor-pointer px-1 py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Chapters
              </button>

              <div className="px-2">
                <div className="text-[11px] font-mono text-[var(--c-accent)] font-semibold uppercase">
                  {activeSubjectName}
                </div>
                <div className="text-sm font-bold text-[var(--c-heading)] mt-0.5">{mobileTopic?.name}</div>
              </div>

              <input
                type="text"
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                placeholder="Filter lectures..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--c-surface)] border border-[var(--c-border)] text-xs text-[var(--c-body)] placeholder-[var(--c-disabled)] focus:outline-none focus:border-[var(--c-primary)]"
              />

              {isContentsLoading ? (
                <div className="py-10 text-center text-[var(--c-muted)] text-xs animate-pulse">
                  Loading lectures...
                </div>
              ) : mobileLectures.length === 0 ? (
                <div className="py-8 text-center text-[var(--c-disabled)] text-xs">
                  No lectures found in this chapter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mobileLectures.map((lecture, index) => {
                    const isCompleted = completedLectures.has(lecture._id);
                    const isBookmarked = bookmarkedLectures.has(lecture._id);
                    return (
                      <div
                        key={lecture._id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isCompleted
                            ? 'border-[var(--c-border)] opacity-80'
                            : 'border-[var(--c-border)] hover:border-[var(--c-tint-strong)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => onToggleComplete(lecture._id)}
                            title={isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                            className="text-[var(--c-disabled)] hover:text-[var(--c-success)] transition-colors cursor-pointer shrink-0"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${isCompleted ? 'text-[var(--c-success)] fill-[#adcfb7]' : ''}`}
                            />
                          </button>
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono text-[var(--c-muted)]">
                              <span className="text-[var(--c-accent)] font-semibold">
                                Lecture {index + 1}
                              </span>
                            </div>
                            <h4 className="text-xs font-medium text-[var(--c-body)] leading-snug line-clamp-2">
                              {lecture.topic}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onToggleBookmark(lecture, activeSubjectName)}
                            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark for Revision'}
                            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'bg-[#eaaa2e]/10 border-[#eaaa2e]/40 text-[#eaaa2e]'
                                : 'border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-body)] hover:bg-[var(--c-tint)]'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#eaaa2e]' : ''}`} />
                          </button>
                          <button
                            onClick={() => onPlayLecture(lecture, activeSubjectName)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[#ffffff] font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Play</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        </>
      ) : activeTab === 'faculty' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTeachers.map((teacher) => {
            const photoUrl = buildImageUrl(teacher.imageId);

            return (
              <div
                key={teacher._id}
                className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-6 space-y-4 hover:border-[var(--c-accent)] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--c-card)] border border-[var(--c-border)] overflow-hidden shrink-0 flex items-center justify-center">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${teacher.firstName} ${teacher.lastName}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-[var(--c-tint)] text-[var(--c-accent)] text-sm font-bold">
                                ${teacher.firstName[0]}${teacher.lastName[0] || ''}
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-[var(--c-accent)]" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[var(--c-heading)]">
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    <p className="text-xs text-[var(--c-accent)] font-mono">
                      {teacher.subject || 'Faculty Mentor'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[var(--c-muted)] border-t border-[var(--c-border)] pt-3">
                  {teacher.experience && (
                    <div className="flex justify-between">
                      <span className="text-[var(--c-disabled)]">Teaching Experience:</span>
                      <span className="text-[var(--c-body)] font-medium">{teacher.experience}+ Years</span>
                    </div>
                  )}
                  {teacher.qualification && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--c-disabled)]">Qualification:</span>
                      <span className="text-[var(--c-body)] font-medium leading-relaxed">
                        {teacher.qualification}
                      </span>
                    </div>
                  )}
                  {teacher.featuredLine && (
                    <div className="pt-2 text-[var(--c-body)] italic border-t border-[var(--c-border)]">
                      &quot;{teacher.featuredLine}&quot;
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Schedule Breakdown */
        <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-6 space-y-4">
          <h3 className="text-lg font-bold text-[var(--c-heading)] mb-2">Curriculum Timeline & Lecture Allocations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(scheduleItems || []).map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-semibold text-[var(--c-heading)]">{item.subject}</h4>
                  <div className="text-xs text-[var(--c-muted)] mt-1 font-mono">
                    <span className="text-[var(--c-accent)] font-medium">{item.lectureCount || 0} Lectures</span>
                    <span className="mx-2 text-[var(--c-muted)]">·</span>
                    <span>{item.tagCount || 0} Sub-topics</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubjectId(item.subjectId);
                    setActiveTab('subjects');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--c-card)] text-[var(--c-accent)] hover:bg-[var(--c-primary)] hover:text-[#ffffff] transition-colors cursor-pointer"
                >
                  View Lectures
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};
