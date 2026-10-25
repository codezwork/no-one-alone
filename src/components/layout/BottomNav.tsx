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
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl px-2 py-1.5 pb-safe">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center rounded-xl px-4 py-1.5 transition-all duration-150 ${
                isActive
                  ? 'text-rose-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon size={22} className={isActive ? 'scale-110 transition-transform' : ''} />
                {tab.id === 'needs' && tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
