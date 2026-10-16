import React from 'react';
import { Calendar, Clock, BookOpen, UserCheck, ArrowLeft, Layers, Sparkles } from 'lucide-react';
import { BatchItem, ScheduleSubjectItem } from '../types/pimaxer';
import { buildImageUrl } from '../services/pimaxerApi';

interface ScheduleViewProps {
  batch: BatchItem;
  scheduleItems: ScheduleSubjectItem[];
  onBack: () => void;
  onSelectSubject: (subjectId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  batch,
  scheduleItems,
  onBack,
  onSelectSubject,
}) => {
  const safeScheduleItems = Array.isArray(scheduleItems) ? scheduleItems : [];
  const totalLectures = safeScheduleItems.reduce((acc, curr) => acc + (curr.lectureCount || 0), 0);
  const totalTags = safeScheduleItems.reduce((acc, curr) => acc + (curr.tagCount || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Header and Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-accent)] text-[var(--c-body)] hover:text-[var(--c-heading)] text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Curriculum Overview</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--c-accent)]">
          <Calendar className="w-4 h-4" />
          <span>Syllabus Allocation & Batch Calendar</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-[var(--c-heading)] tracking-tight">
          {batch.name}
        </h1>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--c-muted)] font-mono pt-1">
          <div>
            Subjects: <span className="text-[var(--c-body)] font-semibold">{safeScheduleItems.length} Modules</span>
          </div>
          <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
          <div>
            Total Lectures: <span className="text-[var(--c-accent)] font-semibold tabular-nums">{totalLectures}</span>
          </div>
          <span aria-hidden="true" className="text-[var(--c-muted)]">·</span>
          <div>
            Curriculum Depth: <span className="text-[var(--c-body)] font-semibold tabular-nums">{totalTags} Chapters</span>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[var(--c-heading)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--c-accent)]" />
          <span>Subject Syllabus Distribution</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeScheduleItems.map((item, index) => {
            const faculty = item.teacherIds?.[0];
            const facultyPhoto = faculty?.imageId ? buildImageUrl(faculty.imageId) : null;

            return (
              <div
                key={item._id}
                className="rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-5 space-y-4 hover:border-[var(--c-accent)] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono text-[var(--c-accent)] font-semibold">
                        Module 0{index + 1}
                      </span>
                      <h3 className="text-base font-bold text-[var(--c-heading)] mt-0.5 leading-snug">
                        {item.subject}
                      </h3>
                    </div>

                    <span className="px-2.5 py-1 rounded-md bg-[var(--c-surface)] border border-[var(--c-border)] text-xs font-mono text-[var(--c-accent)] tabular-nums shrink-0">
                      {item.lectureCount || 0} Lectures
                    </span>
                  </div>

                  {faculty && (
                    <div className="flex items-center gap-3 pt-2 border-t border-[var(--c-border)]">
                      <div className="w-8 h-8 rounded-full bg-[var(--c-card)] border border-[var(--c-border)] overflow-hidden shrink-0 flex items-center justify-center">
                        {facultyPhoto ? (
                          <img
                            src={facultyPhoto}
                            alt={`${faculty.firstName} ${faculty.lastName}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCheck className="w-4 h-4 text-[var(--c-accent)]" />
                        )}
                      </div>
                      <div className="text-xs">
                        <div className="text-[var(--c-body)] font-medium">
                          {faculty.firstName} {faculty.lastName}
                        </div>
                        <div className="text-[var(--c-disabled)] text-[11px] truncate">
                          {faculty.qualification || faculty.subject}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--c-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--c-disabled)] font-mono">
                    {item.tagCount || 0} Practice Chapters
                  </span>
                  <button
                    onClick={() => onSelectSubject(item.subjectId)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--c-tint)] hover:bg-[var(--c-primary)] text-[var(--c-accent)] hover:text-[#ffffff] font-semibold text-xs border border-[var(--c-tint-strong)] hover:border-[var(--c-primary)] transition-colors cursor-pointer"
                  >
                    Open Lectures
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
