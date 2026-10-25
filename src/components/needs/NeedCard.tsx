'use client';
import React from 'react';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  ShieldAlert,
  Check,
  Sparkles,
} from 'lucide-react';

interface NeedCardProps {
  need: any;
  onOpen: (need: any) => void;
  onQuickTake?: (need: any) => void;
}

export function NeedCard({ need, onOpen }: NeedCardProps) {
  const isMedical =
    ['doctor', 'nurse', 'pharmacist'].includes(need.profession) || need.category === 'medicine';
  const isOpen = need.status === 'open';
  const isTaken = need.status === 'taken';
  const isResolved = need.status === 'resolved';

  const timeAgo = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const posterName = need.poster?.firstName || 'Neighbour';
  const helperName = need.helper?.firstName || 'Local Responder';

  // Category & Urgency label
  const getCategoryLabel = () => {
    if (isMedical) return 'Medical Priority';
    if (need.category === 'meal') return 'Food & Drinking Water';
    if (need.category === 'transport') return 'Evacuation / Transport';
    if (need.category === 'childcare') return 'Child & Dependent Care';
    if (need.profession === 'electrician') return 'Electrical Safety';
    if (need.kind === 'general') return 'Community Assistance';
    return need.professionLabel || 'Emergency Support';
  };

  return (
    <div
      onClick={() => onOpen(need)}
      className="glass-card-interactive p-4 sm:p-5 flex flex-col gap-3 group"
    >
      {/* Top Header Row: Floating Distance Pill & Category Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Distance Pill Badge with MapPin SVG */}
          <span className="frosted-badge frosted-badge-distance">
            <MapPin size={11} className="shrink-0 text-current" />
            <span>
              {need.distanceKm != null ? `${need.distanceKm} km away` : 'Within 3.5 km zone'}
            </span>
          </span>

          {/* Category & Urgency Pill */}
          <span
            className={`frosted-badge ${
              isMedical
                ? 'frosted-badge-danger font-bold'
                : 'frosted-badge-neutral'
            }`}
          >
            {isMedical ? <ShieldAlert size={11} className="shrink-0" /> : <Sparkles size={11} className="shrink-0" />}
            <span>{getCategoryLabel()}</span>
          </span>

          {/* Alone Flag Pill */}
          {need.alone && (
            <span className="frosted-badge frosted-badge-neutral font-bold border-neutral-300 dark:border-neutral-700">
              <span>Living Alone</span>
            </span>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1">
          {isOpen && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/15 dark:border-white/20 px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--ink)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Open</span>
            </span>
          )}
          {isTaken && (
            <span className="flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--ink)]">
              <Clock size={11} />
              <span>Claimed</span>
            </span>
          )}
          {isResolved && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} />
              <span>Resolved</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Request Title & 2-Line Description */}
      <div>
        <h3 className="text-base sm:text-[17px] font-bold tracking-tight text-[var(--ink)] transition-colors leading-snug">
          {need.title}
        </h3>
        {need.details && (
          <p className="mt-1 line-clamp-2 text-xs sm:text-[13px] text-[var(--ink-secondary)] leading-relaxed">
            {need.details}
          </p>
        )}
      </div>

      {/* Public Landmark if available */}
      {need.landmark && (
        <div className="flex items-center gap-1 text-[11.5px] text-[var(--muted)]">
          <MapPin size={12} className="shrink-0 text-[var(--muted)]" />
          <span className="truncate">Near landmark: {need.landmark}</span>
        </div>
      )}

      {/* Transparent Community Tracking & Resolution Banner */}
      {isTaken && (
        <div className="accountability-banner mt-0.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <Check size={12} className="stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0 text-xs text-[var(--ink)] leading-snug">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Responsibility Taken:
            </span>{' '}
            <span className="font-semibold text-[var(--ink)]">{helperName}</span> is assisting{' '}
            <span className="font-semibold text-[var(--ink)]">{posterName}</span>
            <span className="block text-[10px] text-[var(--muted)] mt-0.5">
              Broadcasted across 3.5 km radius
            </span>
          </div>
        </div>
      )}

      {/* Resolved State Banner */}
      {isResolved && (
        <div className="accountability-banner mt-0.5 bg-emerald-500/10 border-emerald-500/30">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <Check size={12} className="stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0 text-xs text-[var(--ink)] leading-snug">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Need Satisfied:
            </span>{' '}
            <span className="font-semibold">{posterName}</span> received help from{' '}
            <span className="font-semibold">{helperName}</span>
          </div>
        </div>
      )}

      {/* Subtle Visual Progress Pill Track */}
      <div className="progress-pill-track mt-0.5">
        <span
          className={`inline-flex items-center gap-1 text-[10.5px] ${
            isOpen || isTaken || isResolved
              ? 'text-[var(--ink)] font-bold'
              : 'text-[var(--muted)]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span>1. Posted</span>
        </span>
        <span className="text-[var(--faint)] text-[10px]">/</span>
        <span
          className={`inline-flex items-center gap-1 text-[10.5px] ${
            isTaken
              ? 'text-[var(--ink)] font-bold'
              : isResolved
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--muted)]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span>2. Claimed{isTaken ? ` by ${helperName}` : ''}</span>
        </span>
        <span className="text-[var(--faint)] text-[10px]">/</span>
        <span
          className={`inline-flex items-center gap-1 text-[10.5px] ${
            isResolved
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--muted)]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span>3. Satisfied</span>
        </span>
      </div>

      {/* Privacy Safeguard Note with Lock SVG */}
      <div className="privacy-safeguard">
        <Lock size={12} className="shrink-0 text-[var(--muted)]" />
        <span>Exact door address unlocks only upon accepting responsibility.</span>
      </div>

      {/* Card Footer: Poster Identity and Time */}
      <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 dark:bg-white/15 text-[10px] font-bold text-[var(--ink)]">
            {posterName[0]}
          </div>
          <span className="font-semibold text-[var(--ink)] truncate">
            {posterName}
          </span>
          {need.poster?.professionLabel && (
            <span className="text-[var(--muted)] truncate">
              · {need.poster.professionLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span>{timeAgo(need.createdAt)}</span>
          <ChevronRight size={14} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}
