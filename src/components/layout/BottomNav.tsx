'use client';
import React from 'react';
import { HeartHandshake, PackageSearch, Map, User } from 'lucide-react';

export type TabType = 'needs' | 'trade' | 'map' | 'you';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  openNeedsCount?: number;
}

export function BottomNav({ activeTab, onChangeTab, openNeedsCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'needs' as TabType, label: 'Needs', icon: HeartHandshake, badge: openNeedsCount },
    { id: 'trade' as TabType, label: 'Trade', icon: PackageSearch },
    { id: 'map' as TabType, label: 'Map', icon: Map },
    { id: 'you' as TabType, label: 'You', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 glass-dock p-1.5 w-max max-w-[calc(100%-2rem)] flex items-center gap-1 shadow-2xl"
      aria-label="Navigation dock"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full font-semibold text-xs transition-all duration-200 active:scale-95 ${
              isActive
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-subtle)] border border-transparent'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon size={15} className={isActive ? 'scale-105' : ''} />
              {tab.id === 'needs' && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black px-1 text-[8px] font-black shadow-sm ring-1 ring-[var(--bg-canvas)]">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
