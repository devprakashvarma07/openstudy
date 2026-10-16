import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  ListVideo,
  FileText,
  CheckCircle2,
  Bookmark,
  Share2,
  Download,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ContentLectureItem, BatchItem } from '../types/pimaxer';
import { getStreamUrl } from '../services/pimaxerApi';

interface CinemaPlayerProps {
  currentLecture: ContentLectureItem;
  subjectName: string;
  batch: BatchItem;
  playlist: ContentLectureItem[];
  completedLectures: Set<string>;
  onToggleComplete: (lectureId: string) => void;
  bookmarkedLectures: Set<string>;
  onToggleBookmark: (lecture: ContentLectureItem, subjectName: string) => void;
  onSelectLecture: (lecture: ContentLectureItem) => void;
  onBackToCurriculum: () => void;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  currentLecture,
  subjectName,
  batch,
  playlist,
  completedLectures,
  onToggleComplete,
  bookmarkedLectures,
  onToggleBookmark,
  onSelectLecture,
  onBackToCurriculum,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'playlist' | 'notes'>('playlist');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Study Notes state (persisted per lecture ID)
  const [noteContent, setNoteContent] = useState('');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const streamUrl = getStreamUrl(currentLecture);
  const isCompleted = completedLectures.has(currentLecture._id);
  const isBookmarked = bookmarkedLectures.has(currentLecture._id);

  // Load saved note on lecture change
  useEffect(() => {
    const saved = localStorage.getItem(`pimaxer_note_${currentLecture._id}`);
    if (saved) {
      setNoteContent(saved);
    } else {
      setNoteContent('');
    }
  }, [currentLecture._id]);

  // Handle note typing with auto-save
  const handleNoteChange = (text: string) => {
    setNoteContent(text);
    localStorage.setItem(`pimaxer_note_${currentLecture._id}`, text);
    // Also save in notes index
    const noteMeta = {
      lectureId: currentLecture._id,
      batchId: batch._id,
      batchName: batch.name,
      subjectId: '',
      subjectName,
      lectureTitle: currentLecture.topic,
      content: text,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`pimaxer_note_meta_${currentLecture._id}`, JSON.stringify(noteMeta));
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  // Insert current timestamp into notes
  const handleInsertTimestamp = () => {
    const timeFormatted = formatTime(currentTime);
    const addition = `\n[${timeFormatted}] `;
    handleNoteChange(noteContent + addition);
  };

  // Video event handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(videoRef.current.currentTime + seconds, 0),
        duration
      );
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      if (newVol === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP not supported or failed:', err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't intercept when typing in notes or search
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        setIsTheaterMode((prev) => !prev);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration]);

  // Playlist navigation
  const currentIndex = playlist.findIndex((l) => l._id === currentLecture._id);
  const prevLecture = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const nextLecture = currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Export current note
  const handleExportNote = () => {
    const blob = new Blob([noteContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentLecture.topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_notes.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <button
            onClick={onBackToCurriculum}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{batch.name}</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 truncate">{subjectName}</span>
          <span className="text-slate-600">/</span>
          <span className="text-cyan-400 truncate font-mono">Lecture #{currentIndex + 1}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleBookmark(currentLecture, subjectName)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200 bg-[#101827]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <button
            onClick={() => onToggleComplete(currentLecture._id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'border-[#1e293b] text-slate-400 hover:text-slate-200 bg-[#101827]'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'fill-emerald-400/20' : ''}`} />
            <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
          </button>
        </div>
      </div>

      {/* Main Cinema Screen & Drawer Grid */}
      <div
        className={`grid gap-6 items-start ${
          isTheaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* Cinema Video Player Viewport */}
        <div
          ref={containerRef}
          className={`space-y-4 ${isTheaterMode ? 'lg:col-span-12' : 'lg:col-span-8'}`}
        >
          <div
            className="relative aspect-video rounded-2xl bg-black border border-[#1e293b] overflow-hidden group shadow-2xl"
            onMouseEnter={() => setShowControls(true)}
            onMouseMove={() => {
              setShowControls(true);
              if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              controlsTimeoutRef.current = window.setTimeout(() => {
                if (isPlaying) setShowControls(false);
              }, 3000);
            }}
            onMouseLeave={() => {
              if (isPlaying) setShowControls(false);
            }}
          >
            {/* HTML5 Video element streaming directly */}
            <video
              ref={videoRef}
              src={streamUrl}
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Center Play Button Overlay on Pause */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs cursor-pointer z-10 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                  <Play className="w-7 h-7 fill-slate-950 ml-1" />
                </div>
              </div>
            )}

            {/* Custom Cinema Player Control Bar */}
            <div
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 z-20 transition-opacity duration-300 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Timeline Scrubber */}
              <div className="space-y-1.5 mb-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                />
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-300">
                  <span className="tabular-nums">{formatTime(currentTime)}</span>
                  <span className="text-slate-500 tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-3 text-slate-200">
                {/* Left controls: Play, 10s back/forward, volume */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Rewind 10s (Left Arrow)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSkip(10)}
                    className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Skip 10s (Right Arrow)"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 ml-2 group/vol">
                    <button
                      onClick={toggleMute}
                      className="p-1 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Mute / Unmute (M)"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Right controls: Speed, Theater, PiP, Fullscreen */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  {/* Playback speed selector */}
                  <div className="flex items-center bg-black/60 rounded-md border border-[#1e293b] p-0.5">
                    {[1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          playbackSpeed === spd
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsTheaterMode((prev) => !prev)}
                    className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Toggle Theater Mode (T)"
                  >
                    <Tv className={`w-4 h-4 ${isTheaterMode ? 'text-cyan-400' : ''}`} />
                  </button>

                  <button
                    onClick={togglePip}
                    className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer hidden sm:block"
                    title="Picture in Picture"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Full Screen (F)"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lecture Title & Quick Metadata */}
          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
              <div className="space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                  {subjectName}
                </span>
                <h1 className="text-lg md:text-xl font-bold text-white leading-snug">
                  {currentLecture.topic}
                </h1>
              </div>

              {/* Prev / Next Lecture buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  onClick={() => prevLecture && onSelectLecture(prevLecture)}
                  disabled={!prevLecture}
                  className="px-3 py-1.5 rounded-lg border border-[#1e293b] bg-[#101827] hover:border-cyan-500/40 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => nextLecture && onSelectLecture(nextLecture)}
                  disabled={!nextLecture}
                  className="px-3 py-1.5 rounded-lg border border-[#1e293b] bg-[#101827] hover:border-cyan-500/40 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
              <div>
                Subject Progress:{' '}
                <span className="text-emerald-400 tabular-nums">
                  {playlist.filter((p) => completedLectures.has(p._id)).length} / {playlist.length} Completed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Drawer (Chapters Playlist vs Synchronized Notes) */}
        <div className={`space-y-4 ${isTheaterMode ? 'lg:col-span-12' : 'lg:col-span-4'}`}>
          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 flex flex-col h-[650px]">
            {/* Drawer Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090d16] rounded-xl border border-[#1e293b] mb-4">
              <button
                onClick={() => setActiveSidePanel('playlist')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeSidePanel === 'playlist'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span>Chapter Lectures ({playlist.length})</span>
              </button>

              <button
                onClick={() => setActiveSidePanel('notes')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  activeSidePanel === 'notes'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Study Notes</span>
              </button>
            </div>

            {/* Panel 1: Chapters Playlist */}
            {activeSidePanel === 'playlist' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {playlist.map((item, idx) => {
                  const isCurrent = item._id === currentLecture._id;
                  const itemCompleted = completedLectures.has(item._id);

                  return (
                    <div
                      key={item._id}
                      onClick={() => onSelectLecture(item)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                          : 'bg-[#10192e] border-[#1e293b] text-slate-300 hover:bg-[#141f38] hover:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(item._id);
                        }}
                        className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                        title={itemCompleted ? 'Mark incomplete' : 'Mark complete'}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${itemCompleted ? 'text-emerald-400 fill-emerald-400/20' : ''}`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                          <span className={isCurrent ? 'text-cyan-400 font-semibold' : ''}>
                            Part {idx + 1}
                          </span>
                          {isCurrent && (
                            <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                              Now Playing
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium leading-snug line-clamp-2">
                          {item.topic}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Panel 2: Synchronized Study Notepad */}
            {activeSidePanel === 'notes' && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Personal Lecture Notepad</span>
                    {noteSavedFeedback && (
                      <span className="text-[11px] text-emerald-400 font-mono animate-fade-in">
                        ✓ Saved to storage
                      </span>
                    )}
                  </div>

                  {/* Timestamp injection button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInsertTimestamp}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#101827] border border-[#1e293b] hover:border-cyan-500/40 text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Insert current video timestamp into note"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Tag Time [{formatTime(currentTime)}]</span>
                    </button>

                    <button
                      onClick={handleExportNote}
                      disabled={!noteContent.trim()}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#101827] border border-[#1e293b] hover:border-cyan-500/40 text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer transition-colors ml-auto"
                      title="Download notes file"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export .md</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={noteContent}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder={`Take timestamped revision notes for this lecture...\nExample:\n[02:15] Key formula derivation\n[08:40] Reaction mechanism explanation`}
                  className="flex-1 w-full p-3 rounded-xl bg-[#090d16] border border-[#1e293b] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none font-mono leading-relaxed"
                />

                <div className="text-[11px] text-slate-500 flex justify-between font-mono pt-1">
                  <span>Auto-saved locally</span>
                  <span>{noteContent.length} chars</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
