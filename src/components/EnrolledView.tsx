import React from 'react';
import { GraduationCap, Trash2, ChevronRight, Layers, BookOpen } from 'lucide-react';
import { BatchItem } from '../types/pimaxer';
import { buildImageUrl } from '../services/pimaxerApi';

interface EnrolledViewProps {
  enrolledBatches: BatchItem[];
  onOpenBatch: (batch: BatchItem) => void;
  onRemoveBatch: (batchId: string) => void;
  onBrowseCatalogue: () => void;
}

export const EnrolledView: React.FC<EnrolledViewProps> = ({
  enrolledBatches,
  onOpenBatch,
  onRemoveBatch,
  onBrowseCatalogue,
}) => {
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--c-heading)]">Enrolled Curriculum</h2>
          <p className="text-xs font-mono text-[var(--c-muted)] mt-1">
            {enrolledBatches.length} {enrolledBatches.length === 1 ? 'batch' : 'batches'} saved
          </p>
        </div>
        <button
          onClick={onBrowseCatalogue}
          className="px-3.5 py-2 rounded-xl bg-[var(--c-tint)] hover:bg-[var(--c-tint-strong)] text-[var(--c-accent)] border border-[var(--c-tint-strong)] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          Browse Catalogue
        </button>
      </div>

      {enrolledBatches.length === 0 ? (
        <div className="p-14 text-center rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)]">
          <GraduationCap className="w-10 h-10 mx-auto text-[var(--c-muted)] mb-3" />
          <p className="font-semibold text-sm text-[var(--c-heading)]">No enrolled batches yet</p>
          <p className="mt-1.5 text-xs text-[var(--c-disabled)]">
            Open the catalogue and press Enroll on any batch to save it here.
          </p>
          <button
            onClick={onBrowseCatalogue}
            className="mt-5 px-4 py-2 text-xs font-semibold text-[#ffffff] bg-[var(--c-primary)] rounded-lg hover:bg-[var(--c-primary-hover)] transition-colors cursor-pointer"
          >
            Browse Catalogue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledBatches.map((batch) => {
            const imageUrl = buildImageUrl(batch.previewImage);
            const totalLectures = batch.total_lectures || batch.completed_lectures_count || 0;
            return (
              <div
                key={batch._id}
                className="group flex flex-col justify-between rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] hover:border-[var(--c-accent)] p-5 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div>
                  {/* Card banner */}
                  <div className="relative aspect-video rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] overflow-hidden mb-4">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={batch.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
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

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] font-mono mb-2">
                    <span>Class {batch.class || 'N/A'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{batch.language || 'Hinglish'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{totalLectures} Lectures</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-[var(--c-heading)] group-hover:text-[var(--c-accent)] transition-colors line-clamp-2">
                    {batch.name}
                  </h3>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-[var(--c-border)] flex items-center justify-between gap-3">
                  <button
                    onClick={() => onOpenBatch(batch)}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-[var(--c-tint)] hover:bg-[var(--c-primary)] text-[var(--c-accent)] hover:text-[#ffffff] border border-[var(--c-tint-strong)] hover:border-[var(--c-primary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Curriculum</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onRemoveBatch(batch._id)}
                    title="Remove from Enrolled"
                    className="p-2 text-[var(--c-muted)] hover:text-[var(--c-heading)] hover:bg-[var(--c-surface)] rounded-lg transition-colors border border-transparent hover:border-[var(--c-border-strong)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
