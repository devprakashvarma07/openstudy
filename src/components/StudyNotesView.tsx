import React, { useState, useEffect } from 'react';
import { StickyNote, Bookmark, Play, Trash2, Download, Search, BookOpen, Clock } from 'lucide-react';
import { BookmarkItem, LectureNote } from '../types/pimaxer';

interface StudyNotesViewProps {
  onPlayBookmark: (item: BookmarkItem) => void;
  onRemoveBookmark: (lectureId: string) => void;
  activeTab: 'notes' | 'bookmarks';
}

export const StudyNotesView: React.FC<StudyNotesViewProps> = ({
  onPlayBookmark,
  onRemoveBookmark,
  activeTab,
}) => {
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load notes and bookmarks from localStorage
  const loadSavedItems = () => {
    const loadedNotes: LectureNote[] = [];
    const loadedBookmarks: BookmarkItem[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pimaxer_note_meta_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.content && val.content.trim()) {
            loadedNotes.push(val);
          }
        } catch {
          // ignore corrupted json
        }
      } else if (key?.startsWith('pimaxer_bookmark_item_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.lectureId) {
            loadedBookmarks.push(val);
          }
        } catch {
          // ignore
        }
      }
    }

    setNotes(loadedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setBookmarks(loadedBookmarks.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
  };

  useEffect(() => {
    loadSavedItems();
  }, []);

  const handleDeleteNote = (lectureId: string) => {
    localStorage.removeItem(`pimaxer_note_${lectureId}`);
    localStorage.removeItem(`pimaxer_note_meta_${lectureId}`);
    loadSavedItems();
  };

  const handleExportAllNotes = () => {
    let combined = `# OpenStudy Student Study Notes Repository\nExported: ${new Date().toLocaleString()}\n\n`;
    notes.forEach((n) => {
      combined += `## ${n.lectureTitle}\n`;
      combined += `**Batch:** ${n.batchName || 'General'} | **Subject:** ${n.subjectName || 'Module'}\n`;
      combined += `**Last Modified:** ${new Date(n.updatedAt).toLocaleDateString()}\n\n`;
      combined += `${n.content}\n\n---\n\n`;
    });

    const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pimaxer_all_notes_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.lectureTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.subjectName && n.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.lectureTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Export + Search */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {notes.length > 0 && (
          <button
            onClick={handleExportAllNotes}
            className="px-3.5 py-2 rounded-xl bg-[var(--c-tint)] hover:bg-[var(--c-tint-strong)] text-[var(--c-accent)] border border-[var(--c-tint-strong)] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export All Notes (.md)</span>
            <span className="sm:hidden">Export</span>
          </button>
        )}

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--c-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or bookmarks..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] text-xs text-[var(--c-body)] placeholder-[var(--c-disabled)] focus:outline-none focus:border-[var(--c-primary)]"
          />
        </div>
      </div>

      {/* Tab 1: Lecture Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-disabled)] text-xs">
              <StickyNote className="w-10 h-10 mx-auto text-[var(--c-muted)] mb-2" />
              <p className="font-medium text-[var(--c-body)]">No notes written yet</p>
              <p className="mt-1">
                While watching any lecture, switch to the &quot;Study Notes&quot; tab to write and auto-save notes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.lectureId}
                  className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-5 space-y-3 flex flex-col justify-between hover:border-[var(--c-accent)] transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono text-[var(--c-accent)] font-semibold uppercase">
                          {note.subjectName || 'Curriculum'}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--c-heading)] line-clamp-2 mt-0.5">
                          {note.lectureTitle}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.lectureId)}
                        title="Delete note"
                        className="text-[var(--c-disabled)] hover:text-[#bf2734] transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] font-mono text-xs text-[var(--c-body)] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {note.content}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--c-border)] flex items-center justify-between text-[11px] font-mono text-[var(--c-disabled)]">
                    <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                    <span>{note.content.length} characters</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {filteredBookmarks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-disabled)] text-xs">
              <Bookmark className="w-10 h-10 mx-auto text-[var(--c-muted)] mb-2" />
              <p className="font-medium text-[var(--c-body)]">No bookmarked lectures</p>
              <p className="mt-1">
                Click the bookmark icon on any lecture in the curriculum or lecture player to save it here for fast review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBookmarks.map((bm) => (
                <div
                  key={bm.lectureId}
                  className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-5 space-y-3 flex flex-col justify-between hover:border-[var(--c-accent)] transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono text-[var(--c-accent)] font-semibold uppercase">
                          {bm.subjectName}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--c-heading)] line-clamp-2 mt-0.5">
                          {bm.lectureTitle}
                        </h3>
                      </div>
                      <button
                        onClick={() => onRemoveBookmark(bm.lectureId)}
                        title="Remove bookmark"
                        className="text-[#eaaa2e] hover:text-[var(--c-muted)] transition-colors p-1"
                      >
                        <Bookmark className="w-4 h-4 fill-[#eaaa2e]" />
                      </button>
                    </div>

                    <p className="text-xs text-[var(--c-muted)]">
                      Batch: <span className="text-[var(--c-body)]">{bm.batchName}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--c-border)] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[var(--c-disabled)]">
                      Saved {new Date(bm.savedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onPlayBookmark(bm)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[#ffffff] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Resume Lecture</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
