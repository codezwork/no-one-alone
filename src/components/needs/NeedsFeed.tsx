'use client';
import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Plus,
  Filter,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  AlertCircle,
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
    <div className="space-y-4 px-4 py-4 animate-fade-in">
      {/* Top Action Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/60 via-slate-900 to-amber-950/40 p-5 shadow-xl">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
              <Sparkles size={11} />
              Calamity Mutual Aid
            </span>
            <h2 className="mt-2 text-lg font-black tracking-tight text-white sm:text-xl">
              Find & Give Help Locally
            </h2>
            <p className="mt-1 text-xs text-slate-300 max-w-xs leading-relaxed">
              When disaster strikes, your immediate neighbours are your first responders.
            </p>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950/60 hover:opacity-90 active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>Post a Need</span>
          </button>
        </div>

        {/* Stats Pill */}
        {data.stats && (
          <div className="mt-4 flex items-center gap-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 size={13} />
              <span>{data.stats.metToday || 0} resolved today</span>
            </span>
            <span>·</span>
            <span>{data.stats.helpersNearby || 0} helpers in range</span>
          </div>
        )}
      </div>

      {/* Requests I am helping with or posted */}
      {(helping.length > 0 || mine.length > 0) && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            My Active Involvements
          </h3>
          <div className="space-y-2">
            {helping.map((n: any) => (
              <NeedCard key={n.id} need={n} onOpen={(item) => setSelectedNeedId(item.id)} />
            ))}
            {mine.map((n: any) => (
              <NeedCard key={n.id} need={n} onOpen={(item) => setSelectedNeedId(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1 no-scrollbar">
        <div className="flex gap-1.5">
          {[
            { id: 'all', label: `All (${allOpen.length})` },
            { id: 'medical', label: 'Medical' },
            { id: 'general', label: 'General Help' },
            { id: 'alone', label: 'Alone' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === f.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchNeeds}
          className="rounded-xl p-2 text-slate-400 hover:text-white transition-colors"
          title="Refresh Feed"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Open Needs List */}
      <div className="space-y-2.5 pt-1">
        {loading && allOpen.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mb-2" />
            <p className="text-xs">Finding needs in your area...</p>
          </div>
        ) : filteredOpen.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
            <ShieldCheck size={36} className="mx-auto text-emerald-400/80 mb-2" />
            <h4 className="text-sm font-bold text-white">No Open Requests Right Now</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
              All is calm in your {user?.radiusKm || 4} km radius. Post a need if you or someone nearby requires urgent assistance.
            </p>
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

      {/* Need Detail & Chat Modal */}
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
