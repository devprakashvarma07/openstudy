import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw, Zap, Server, Globe, ShieldCheck, Activity } from 'lucide-react';
import { HealthResponse } from '../types/pimaxer';
import { checkGatewayHealth } from '../services/pimaxerApi';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
  onUpdateHealth: (h: HealthResponse) => void;
}

export const HealthModal: React.FC<HealthModalProps> = ({
  isOpen,
  onClose,
  health,
  onUpdateHealth,
}) => {
  const [isPinging, setIsPinging] = useState(false);

  if (!isOpen) return null;

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const res = await checkGatewayHealth();
      onUpdateHealth(res);
    } finally {
      setIsPinging(false);
    }
  };

  const endpoints = [
    { method: 'GET', path: '/health', desc: 'System health and status', status: 'Operational' },
    { method: 'GET', path: '/v1/batches?page=1&limit=50', desc: 'Batches directory catalogue', status: 'Operational' },
    { method: 'GET', path: '/v1/{batch_id}/get-batch-subjects', desc: 'Subject modules for a batch', status: 'Operational' },
    { method: 'GET', path: '/v1/{batch_id}/subject/{subject_id}/topics', desc: 'Topic chapters tree', status: 'Operational' },
    { method: 'GET', path: '/v1/{batch_id}/subject/{subject_id}/contents', desc: 'Lectures, notes and resource items', status: 'Operational' },
    { method: 'GET', path: '/v1/{batch_id}/schedule', desc: 'Batch calendar and timeline schedule', status: 'Operational' },
    { method: 'GET', path: '/v1/videos/{video_id}', desc: 'Video streaming metadata and stream URL', status: 'Operational' },
    { method: 'GET', path: '/stream/{uuid}/video.mp4', desc: 'Low-latency native byte stream proxy', status: 'Operational' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-h-[85vh] overflow-y-auto max-w-2xl rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] p-5 md:p-6 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--c-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--c-tint)] border border-[var(--c-tint-strong)] flex items-center justify-center text-[var(--c-accent)]">
              <Zap className="w-5 h-5 fill-[var(--c-tint-strong)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--c-heading)] flex items-center gap-2">
                <span>OpenStudy Cloud CDN & Gateway</span>
                <span className="text-[11px] font-mono font-medium text-[var(--c-success)] bg-[var(--c-success-soft)] border border-[var(--c-success)] px-2 py-0.5 rounded-full">
                  Systems Operational
                </span>
              </h2>
              <p className="text-xs text-[var(--c-muted)] font-mono">https://a.pimaxer.in</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-[var(--c-heading)] hover:bg-[var(--c-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Diagnostics Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] space-y-1">
            <div className="text-[11px] text-[var(--c-muted)] font-mono">Service Name</div>
            <div className="text-sm font-semibold text-[var(--c-heading)] truncate">
              {health?.service?.replace(/PiMaxer/gi, 'OpenStudy') || 'OpenStudy API'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] space-y-1">
            <div className="text-[11px] text-[var(--c-muted)] font-mono">Round-Trip Latency</div>
            <div className="text-sm font-semibold text-[var(--c-accent)] font-mono tabular-nums">
              {health?.latencyMs !== undefined ? `${health.latencyMs} ms` : 'Testing...'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] space-y-1">
            <div className="text-[11px] text-[var(--c-muted)] font-mono">Byte Stream Proxy</div>
            <div className="text-sm font-semibold text-[var(--c-success)]">Low-Latency MP4</div>
          </div>
        </div>

        {/* Endpoints Directory */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--c-muted)]">
            <span>Verified API Endpoints</span>
            <button
              onClick={handlePing}
              disabled={isPinging}
              className="flex items-center gap-1.5 text-[var(--c-accent)] hover:text-[var(--c-accent)] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Ping Gateway</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {endpoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[var(--c-card)] border border-[var(--c-border)] flex items-center justify-between gap-3 text-[var(--c-body)]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--c-tint)] text-[var(--c-accent)] border border-[var(--c-tint-strong)]">
                    {ep.method}
                  </span>
                  <span className="text-[var(--c-body)] font-semibold truncate">{ep.path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[var(--c-disabled)] text-[11px] hidden sm:inline">{ep.desc}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--c-success)]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--c-border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-[#ffffff] transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
