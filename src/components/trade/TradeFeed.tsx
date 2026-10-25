'use client';
import React, { useState, useEffect } from 'react';
import { Package, Plus, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';
import { ListingCard } from './ListingCard';
import { PostListingModal } from './PostListingModal';
import { ListingDetailModal } from './ListingDetailModal';
import { TRADE_CATEGORIES } from '@/lib/rules';

interface TradeFeedProps {
  token: string;
  user: any;
}

export function TradeFeed({ token, user }: TradeFeedProps) {
  const [data, setData] = useState<any>({ nearby: [], mine: [], requested: [] });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const fetchListings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/listings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const nearby = data.nearby || [];
  const mine = data.mine || [];
  const requested = data.requested || [];

  const filteredNearby = nearby.filter((item: any) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (freeOnly && !item.free) return false;
    return true;
  });

  return (
    <div className="space-y-4 px-4 py-4 animate-fade-in">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 p-5 shadow-xl">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <Sparkles size={11} />
              Hyperlocal Essentials
            </span>
            <h2 className="mt-2 text-lg font-black tracking-tight text-white sm:text-xl">
              Local Supplies & Trade
            </h2>
            <p className="mt-1 text-xs text-slate-300 max-w-xs leading-relaxed">
              Find emergency water, power banks, first aid and tools within {user?.radiusKm || 4} km.
            </p>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/60 hover:opacity-90 active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>Offer Item</span>
          </button>
        </div>
      </div>

      {/* My Listings & Requested items */}
      {(mine.length > 0 || requested.length > 0) && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            My Offers & Requests
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {mine.map((l: any) => (
              <ListingCard key={l.id} listing={l} onOpen={(item) => setSelectedListingId(item.id)} />
            ))}
            {requested.map((l: any) => (
              <ListingCard key={l.id} listing={l} onOpen={(item) => setSelectedListingId(item.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Filter Categories */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1 no-scrollbar">
        <div className="flex gap-1.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              categoryFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFreeOnly(!freeOnly)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
              freeOnly
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-800 bg-slate-800/40 text-slate-400'
            }`}
          >
            Free Only
          </button>
          {TRADE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                categoryFilter === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchListings}
          className="rounded-xl p-2 text-slate-400 hover:text-white transition-colors"
          title="Refresh Items"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grid of items */}
      <div className="pt-1">
        {loading && nearby.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
            <p className="text-xs">Finding available essentials nearby...</p>
          </div>
        ) : filteredNearby.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
            <Package size={36} className="mx-auto text-slate-600 mb-2" />
            <h4 className="text-sm font-bold text-white">No Items Listed Yet</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
              Be the first to offer spare drinking water, batteries, torches or medicines to people in your area.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredNearby.map((item: any) => (
              <ListingCard
                key={item.id}
                listing={item}
                onOpen={(l) => setSelectedListingId(l.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <PostListingModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        token={token}
        onListingCreated={fetchListings}
      />

      <ListingDetailModal
        listingId={selectedListingId}
        onClose={() => setSelectedListingId(null)}
        token={token}
        currentUser={user}
        onActionComplete={fetchListings}
      />
    </div>
  );
}
