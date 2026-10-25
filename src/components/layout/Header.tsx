'use client';
import React, { useState } from 'react';
import { Bell, MapPin, ShieldAlert, Sun, Moon } from 'lucide-react';
import { SosModal } from '../ui/SosModal';
import { Logo } from '../ui/Logo';
import { useTheme } from '@/lib/theme';

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
  const { isDark, toggleTheme } = useTheme();

  const radiusKm = user?.radiusKm || 3.5;

  return (
    <>
      {/* Floating Dynamic Island / Apple Pill Header */}
      <header
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl glass-island px-3 sm:px-4 py-2 flex items-center justify-between gap-2"
        role="banner"
      >
        {/* Left: App Brand & Mark with Two Hands Joining SVG Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <Logo size={32} />
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[13.5px] sm:text-sm font-black tracking-tight text-[var(--ink)] truncate">
                No One Alone
              </span>
              <span className="hidden sm:inline-block rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--muted)]">
                Locality Aid
              </span>
            </div>

            {/* Live Pulsing Locality Indicator with MapPin SVG instead of text emoji */}
            <button
              onClick={onOpenLocationSettings}
              className="mt-0.5 flex items-center gap-1 text-left group"
              title="Change locality radius or location"
            >
              <MapPin size={10} className="shrink-0 text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors" />
              <span className="text-[10.5px] sm:text-[11px] font-medium text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors truncate">
                {radiusKm} km Locality Active
              </span>
            </button>
          </div>
        </div>

        {/* Right: Quick Controls in Frosted Glass Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-all active:scale-95 shadow-sm"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={14} className="text-[var(--ink)]" /> : <Moon size={14} className="text-[var(--ink)]" />}
          </button>

          {/* Minimalist Monochrome SOS Helpline Pill */}
          <button
            onClick={() => setShowSos(true)}
            className="flex items-center gap-1 rounded-full bg-black dark:bg-white text-white dark:text-black border border-black/10 dark:border-white/20 px-2.5 py-1 text-[11px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm"
            title="Emergency Helplines"
          >
            <ShieldAlert size={12} className="shrink-0" />
            <span>SOS</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-all active:scale-95 shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black text-[8.5px] font-black shadow-sm ring-1 ring-[var(--bg-canvas)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Compact User Pill Badge */}
          {user && (
            <button
              onClick={onOpenLocationSettings}
              className="hidden xs:flex items-center gap-1.5 rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] pl-1 pr-2 py-0.5 hover:bg-[var(--glass-bg-elevated)] transition-all active:scale-95 shadow-sm"
              title="Personal Settings & Profile"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black dark:bg-white text-[10px] font-bold text-white dark:text-black overflow-hidden">
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user?.name?.[0] || 'U'
                )}
              </div>
              <span className="text-[11px] font-semibold text-[var(--ink)] max-w-[65px] truncate">
                {user.name?.split(' ')[0] || 'You'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* SOS Modal */}
      <SosModal isOpen={showSos} onClose={() => setShowSos(false)} />
    </>
  );
}
