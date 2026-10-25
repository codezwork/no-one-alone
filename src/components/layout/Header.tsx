'use client';
import React, { useState } from 'react';
import { Bell, MapPin, ShieldAlert } from 'lucide-react';
import { SosModal } from '../ui/SosModal';

interface HeaderProps {
  user: any;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenLocationSettings: () => void;
}

export function Header({
  user,
  unreadCount,
  onOpenNotifications,
  onOpenLocationSettings,
}: HeaderProps) {
  const [showSos, setShowSos] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800/80 bg-[#090d16]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 shadow-md shadow-rose-900/30">
            <span className="font-black text-white text-base">N</span>
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">Neighbours</h1>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                No One Alone
              </span>
            </div>
            {user?.lat ? (
              <button
                onClick={onOpenLocationSettings}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                <MapPin size={10} className="text-rose-400" />
                <span>{user.radiusKm || 4} km radius active</span>
              </button>
            ) : (
              <button
                onClick={onOpenLocationSettings}
                className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:underline"
              >
                <MapPin size={10} />
                <span>Set your location</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSos(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-400 shadow-sm transition-all hover:bg-rose-500 hover:text-white active:scale-95"
            title="Emergency Helplines"
          >
            <ShieldAlert size={14} />
            <span className="hidden sm:inline">SOS</span>
          </button>

          <button
            onClick={onOpenNotifications}
            className="relative rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <SosModal isOpen={showSos} onClose={() => setShowSos(false)} />
    </>
  );
}
