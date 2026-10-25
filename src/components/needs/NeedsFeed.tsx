'use client';
import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Plus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Users,
  MapPin,
} from 'lucide-react';
import { NeedCard } from './NeedCard';
import { PostNeedModal } from './PostNeedModal';
import { NeedDetailModal } from './NeedDetailModal';

interface NeedsFeedProps {
  token: string;
  user: any;
  onRefreshStats?: (count: number) => void;
}

export function NeedsFeed({ token, user, onRefreshStats }: NeedsFeedProps) {
  const [data, setData] = useState<any>({ mine: [], helping: [], open: [], community: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'medical' | 'general' | 'alone'>('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);

  const fetchNeeds = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/needs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        onRefreshStats?.(d.open?.length || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds();
    const interval = setInterval(fetchNeeds, 6000);
    return () => clearInterval(interval);
  }, [token]);

  const allOpen = data.open || [];
  const mine = data.mine || [];
  const helping = data.helping || [];

  const filteredOpen = allOpen.filter((n: any) => {
    if (filter === 'medical') {
      return ['doctor', 'nurse', 'pharmacist'].includes(n.profession) || n.category === 'medicine';
    }
    if (filter === 'general') return n.kind === 'general';
    if (filter === 'alone') return n.alone;
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Calamity Aid Frosted Glass Hero Card */}
      <div className="glass-card p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <span className="frosted-badge frosted-badge-neutral">
              <Sparkles size={11} className="shrink-0" />
              <span>Hyperlocal 3–4 km Mutual Aid</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">
              No One Alone
            </h2>
            <p className="text-xs sm:text-[13px] text-[var(--ink-secondary)] max-w-sm leading-relaxed">
              When calamities occur, your nearest community members are your first line of response and care.
            </p>
          </div>

          {/* Minimalist Black/White Pill Button: Post a Need */}
          <button
            onClick={() => setShowPostModal(true)}
            className="btn-pill btn-pill-primary shrink-0 shadow-lg"
          >
            <Plus size={15} />
            <span>Post a Need</span>
          </button>
        </div>

        {/* Community Live Stats Pill */}
        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)] flex-wrap">
          <span className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>{data.stats?.metToday || 0} resolved today</span>
          </span>
          <span className="text-[var(--line-2)]">/</span>
          <span className="flex items-center gap-1">
            <Users size={12} className="text-[var(--muted)]" />
            <span>{data.stats?.helpersNearby || 0} neighbours in range</span>
          </span>
          <span className="text-[var(--line-2)]">/</span>
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-[var(--muted)]" />
            <span>{user?.radiusKm || 3.5} km active circle</span>
          </span>
        </div>
      </div>

      {/* Active Involvements Section */}
      {(helping.length > 0 || mine.length > 0) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Your Active Mutual Aid
            </h3>
            <span className="text-[11px] font-semibold text-[var(--ink)]">
              {helping.length + mine.length} ongoing
            </span>
          </div>
          <div className="space-y-2.5">
            {helping.map((n: any) => (
              <NeedCard key={n.id} need={n} onOpen={(item) => setSelectedNeedId(item.id)} />
            ))}
            {mine.map((n: any) => (
              <NeedCard key={n.id} need={n} onOpen={(item) => setSelectedNeedId(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Frosted Pill Filter Tabs & Refresh Button */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto py-1 no-scrollbar">
        <div className="flex gap-1.5">
          {[
            { id: 'all', label: `All Requests (${allOpen.length})` },
            { id: 'medical', label: 'Medical' },
            { id: 'general', label: 'General Help' },
            { id: 'alone', label: 'Living Alone' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`btn-pill text-xs py-1.5 px-3.5 min-h-[34px] ${
                filter === f.id
                  ? 'btn-pill-primary font-bold shadow-sm'
                  : 'btn-pill-secondary font-medium'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchNeeds}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-all active:scale-95 shadow-sm"
          title="Refresh Feed"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Locality Feed Requests */}
      <div className="space-y-3 pt-0.5">
        {loading && allOpen.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-black dark:border-white border-t-transparent mb-3" />
            <p className="text-xs font-semibold text-[var(--muted)]">
              Scanning 3–4 km neighbourhood for active needs...
            </p>
          </div>
        ) : filteredOpen.length === 0 ? (
          <div className="glass-card p-8 sm:p-10 text-center flex flex-col items-center justify-center border-dashed">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] text-[var(--ink)] mb-3">
              <ShieldCheck size={26} />
            </div>
            <h4 className="text-base font-bold text-[var(--ink)]">
              All Calm in Your Locality
            </h4>
            <p className="mt-1 text-xs text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
              No open crisis requests in your {user?.radiusKm || 3.5} km zone. Post a need if you or someone nearby needs urgent help.
            </p>
            <button
              onClick={() => setShowPostModal(true)}
              className="mt-4 btn-pill btn-pill-primary text-xs"
            >
              <Plus size={14} />
              <span>Ask for Community Help</span>
            </button>
          </div>
        ) : (
          filteredOpen.map((need: any) => (
            <NeedCard
              key={need.id}
              need={need}
              onOpen={(item) => setSelectedNeedId(item.id)}
            />
          ))
        )}
      </div>

      {/* Post Need Modal */}
      <PostNeedModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        token={token}
        onNeedCreated={fetchNeeds}
      />

      {/* Need Detail & In-App Chat Modal */}
      <NeedDetailModal
        needId={selectedNeedId}
        onClose={() => setSelectedNeedId(null)}
        token={token}
        currentUser={user}
        onActionComplete={fetchNeeds}
      />
    </div>
  );
}
