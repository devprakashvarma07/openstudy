import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BatchCatalog } from './components/BatchCatalog';
import { BatchDetail } from './components/BatchDetail';
import { CinemaPlayer } from './components/CinemaPlayer';
import { StudyNotesView } from './components/StudyNotesView';
import { EnrolledView } from './components/EnrolledView';
import { ScheduleView } from './components/ScheduleView';
import { HealthModal } from './components/HealthModal';
import {
  BatchItem,
  ContentLectureItem,
  HealthResponse,
  BookmarkItem,
  ScheduleSubjectItem,
} from './types/pimaxer';
import {
  checkGatewayHealth,
  fetchBatches,
  fetchBatchSchedule,
  fetchSubjectContents,
} from './services/pimaxerApi';

export default function App() {
  const [activeView, setActiveView] = useState<'batches' | 'batch-detail' | 'enrolled' | 'notes' | 'schedule'>('notes');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Batches state
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isBatchesLoading, setIsBatchesLoading] = useState(true);

  // Active Batch & Lecture states
  const [activeBatch, setActiveBatch] = useState<BatchItem | null>(null);
  const [batchSchedule, setBatchSchedule] = useState<ScheduleSubjectItem[]>([]);
  const [currentLecture, setCurrentLecture] = useState<ContentLectureItem | null>(null);
  const [currentSubjectName, setCurrentSubjectName] = useState<string>('Lecture Series');
  const [currentPlaylist, setCurrentPlaylist] = useState<ContentLectureItem[]>([]);

  // Study view tab (Study = notes, Bookmarked = bookmarks) controlled at app level
  // so bottom/side navigation can open the right tab directly.
  const [notesTab, setNotesTab] = useState<'notes' | 'bookmarks'>('notes');

  // Whether the lecture player is open inside the Study tab
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Theme: system mode by default, user toggle persisted (dark/light)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('os-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* storage unavailable */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('os-theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  // Keep following OS changes until the user picks a theme manually
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem('os-theme');
      } catch {
        /* storage unavailable */
      }
      if (saved !== 'light' && saved !== 'dark') setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleOpenNotesTab = (tab: 'notes' | 'bookmarks') => {
    setNotesTab(tab);
    setIsPlayerOpen(false);
    setActiveView('notes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persistent User Progress (Completed lectures & Bookmarks)
  const [completedLectures, setCompletedLectures] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pimaxer_completed_lectures');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [bookmarkedLectures, setBookmarkedLectures] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pimaxer_bookmarks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Enrolled batches (saved locally; shown in the Enrolled section)
  const [enrolledBatches, setEnrolledBatches] = useState<BatchItem[]>(() => {
    try {
      const saved = localStorage.getItem('os_enrolled_batches');
      return saved ? (JSON.parse(saved) as BatchItem[]) : [];
    } catch {
      return [];
    }
  });

  // Where the open batch curriculum was reached from (catalogue or enrolled list)
  const [batchDetailOrigin, setBatchDetailOrigin] = useState<'batches' | 'enrolled'>('batches');

  // Initial gateway health probe
  useEffect(() => {
    let isMounted = true;
    checkGatewayHealth().then((res) => {
      if (isMounted) setHealth(res);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch batches catalogue on page change
  useEffect(() => {
    let isMounted = true;
    setIsBatchesLoading(true);
    fetchBatches(currentPage, 50).then((res) => {
      if (isMounted) {
        setBatches(res.data || []);
        setTotalBatches(res.total || res.data?.length || 0);
        setIsBatchesLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  // Load batch schedule when active batch changes
  useEffect(() => {
    if (!activeBatch) return;
    let isMounted = true;
    fetchBatchSchedule(activeBatch._id).then((sched) => {
      if (isMounted) {
        setBatchSchedule(sched);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeBatch]);

  // Handle select batch
  const handleSelectBatch = (batch: BatchItem) => {
    setActiveBatch(batch);
    setBatchDetailOrigin('batches');
    setActiveView('batch-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Enroll: save the batch locally and jump to the Enrolled section
  const handleEnrollBatch = (batch: BatchItem) => {
    setEnrolledBatches((prev) => {
      if (prev.some((b) => b._id === batch._id)) return prev;
      const next = [...prev, batch];
      localStorage.setItem('os_enrolled_batches', JSON.stringify(next));
      return next;
    });
    setActiveView('enrolled');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open a batch from the Enrolled section
  const handleOpenEnrolledBatch = (batch: BatchItem) => {
    setActiveBatch(batch);
    setBatchDetailOrigin('enrolled');
    setActiveView('batch-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Remove a batch from the Enrolled section
  const handleRemoveEnrolledBatch = (batchId: string) => {
    setEnrolledBatches((prev) => {
      const next = prev.filter((b) => b._id !== batchId);
      localStorage.setItem('os_enrolled_batches', JSON.stringify(next));
      return next;
    });
  };

  // Handle play lecture from curriculum
  const handlePlayLecture = async (lecture: ContentLectureItem, subjectName: string) => {
    setCurrentLecture(lecture);
    setCurrentSubjectName(subjectName);

    // If activeBatch, load the rest of the subject's playlist if not already loaded
    if (activeBatch) {
      const allContents = await fetchSubjectContents(activeBatch._id, lecture._id.split('_')[0] || '');
      if (allContents.length > 0) {
        setCurrentPlaylist(allContents);
      } else {
        setCurrentPlaylist([lecture]);
      }
    } else {
      setCurrentPlaylist([lecture]);
    }

    setActiveView('notes');
    setIsPlayerOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle lecture completion
  const handleToggleComplete = (lectureId: string) => {
    setCompletedLectures((prev) => {
      const next = new Set(prev);
      if (next.has(lectureId)) {
        next.delete(lectureId);
      } else {
        next.add(lectureId);
      }
      localStorage.setItem('pimaxer_completed_lectures', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Toggle lecture bookmark
  const handleToggleBookmark = (lecture: ContentLectureItem, subjectName: string) => {
    setBookmarkedLectures((prev) => {
      const next = new Set(prev);
      const isAlready = next.has(lecture._id);

      if (isAlready) {
        next.delete(lecture._id);
        localStorage.removeItem(`pimaxer_bookmark_item_${lecture._id}`);
      } else {
        next.add(lecture._id);
        const item: BookmarkItem = {
          lectureId: lecture._id,
          batchId: activeBatch?._id || '',
          batchName: activeBatch?.name || 'Enrolled Batch',
          subjectId: '',
          subjectName: subjectName || 'Module Subject',
          lectureTitle: lecture.topic,
          videoUrl: lecture.url || lecture.videoDetails?.videoUrl || '',
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(`pimaxer_bookmark_item_${lecture._id}`, JSON.stringify(item));
      }

      localStorage.setItem('pimaxer_bookmarks', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Play bookmark from Study Notes view
  const handlePlayBookmark = (bm: BookmarkItem) => {
    const lectureItem: ContentLectureItem = {
      _id: bm.lectureId,
      topic: bm.lectureTitle,
      url: bm.videoUrl,
      isLocked: false,
      isFree: true,
    };
    setCurrentLecture(lectureItem);
    setCurrentSubjectName(bm.subjectName);
    setCurrentPlaylist([lectureItem]);
    setActiveView('notes');
    setIsPlayerOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveBookmark = (lectureId: string) => {
    setBookmarkedLectures((prev) => {
      const next = new Set(prev);
      next.delete(lectureId);
      localStorage.removeItem(`pimaxer_bookmark_item_${lectureId}`);
      localStorage.setItem('pimaxer_bookmarks', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-heading)] flex flex-col justify-between selection:bg-[var(--c-tint-strong)] selection:text-[var(--c-primary-hover)]">
      <div>
        {/* Navigation Bar (Strict 3-zone contract) */}
        <Navbar
          activeView={activeView}
          onNavigate={(view) => {
            setActiveView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          hasActiveBatch={!!activeBatch}
          hasEnrolled={enrolledBatches.length > 0}
          isPlayerOpen={isPlayerOpen}
          notesTab={notesTab}
          onOpenNotesTab={handleOpenNotesTab}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
          {activeView === 'batches' && (
            <BatchCatalog
              batches={batches}
              totalBatches={totalBatches}
              currentPage={currentPage}
              isLoading={isBatchesLoading}
              onPageChange={(page) => setCurrentPage(page)}
              onSelectBatch={handleSelectBatch}
              enrolledIds={new Set(enrolledBatches.map((b) => b._id))}
              onEnrollBatch={handleEnrollBatch}
            />
          )}

          {activeView === 'enrolled' && (
            <EnrolledView
              enrolledBatches={enrolledBatches}
              onOpenBatch={handleOpenEnrolledBatch}
              onRemoveBatch={handleRemoveEnrolledBatch}
              onBrowseCatalogue={() => {
                setActiveView('batches');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeView === 'batch-detail' && activeBatch && (
            <BatchDetail
              batch={activeBatch}
              onBack={() => setActiveView(batchDetailOrigin)}
              onPlayLecture={handlePlayLecture}
              completedLectures={completedLectures}
              onToggleComplete={handleToggleComplete}
              bookmarkedLectures={bookmarkedLectures}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeView === 'notes' && isPlayerOpen && currentLecture && (
            <CinemaPlayer
              currentLecture={currentLecture}
              subjectName={currentSubjectName}
              batch={activeBatch || { _id: '', name: 'Curriculum Batch', class: '', slug: '', status: '' }}
              playlist={currentPlaylist}
              completedLectures={completedLectures}
              onToggleComplete={handleToggleComplete}
              bookmarkedLectures={bookmarkedLectures}
              onToggleBookmark={handleToggleBookmark}
              onSelectLecture={(lec) => setCurrentLecture(lec)}
              onBackToCurriculum={() => {
                if (activeBatch) setActiveView(batchDetailOrigin);
                else setActiveView('batches');
              }}
            />
          )}

          {activeView === 'notes' && (!isPlayerOpen || !currentLecture) && (
            <StudyNotesView
              activeTab={notesTab}
              onPlayBookmark={handlePlayBookmark}
              onRemoveBookmark={handleRemoveBookmark}
            />
          )}

          {activeView === 'schedule' && activeBatch && (
            <ScheduleView
              batch={activeBatch}
              scheduleItems={batchSchedule}
              onBack={() => setActiveView('batch-detail')}
              onSelectSubject={() => setActiveView('batch-detail')}
            />
          )}
        </main>
      </div>

      {/* Gateway Health Diagnostics Modal */}
      <HealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={health}
        onUpdateHealth={(newHealth) => setHealth(newHealth)}
      />
    </div>
  );
}
