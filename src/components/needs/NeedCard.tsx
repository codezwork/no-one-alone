'use client';
import React from 'react';
import {
  Stethoscope,
  HeartHandshake,
  AlertCircle,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface NeedCardProps {
  need: any;
  onOpen: (need: any) => void;
  onQuickTake?: (need: any) => void;
}

export function NeedCard({ need, onOpen, onQuickTake }: NeedCardProps) {
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

  return (
    <div
      onClick={() => onOpen(need)}
      className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99] ${
        isOpen
          ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900 shadow-md'
          : isTaken
          ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
          : 'border-slate-800/60 bg-slate-900/40 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {isOpen ? (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Open Request
            </span>
          ) : isTaken ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
              <Clock size={11} />
              Helper on the way
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
              <CheckCircle2 size={11} />
              Resolved
            </span>
          )}

          {/* Alone Pill */}
          {need.alone && (
            <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
              Alone
            </span>
          )}
        </div>

        {/* Distance */}
        {need.distanceKm != null && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <MapPin size={12} className="text-rose-400" />
            <span>{need.distanceKm} km</span>
          </span>
        )}
      </div>

      {/* Title & Details */}
      <div className="mt-2.5">
        <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
          {need.title}
        </h3>
        {need.details && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-300 leading-relaxed">
            {need.details}
          </p>
        )}
      </div>

      {/* Landmark */}
      {need.landmark && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin size={12} className="text-slate-500 shrink-0" />
          <span className="truncate">Near: {need.landmark}</span>
        </div>
      )}

      {/* Bottom Footer info */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
            {need.poster?.firstName?.[0] || 'N'}
          </div>
          <span className="font-medium text-slate-300">
            {need.poster?.firstName || 'Neighbour'}
          </span>
          {need.poster?.professionLabel && (
            <span className="text-slate-500">· {need.poster.professionLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>{timeAgo(need.createdAt)}</span>
          <ChevronRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}
