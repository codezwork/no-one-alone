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
    <div className="space-y-4 animate-fade-in">
      {/* Top Banner in Frosted Glass */}
      <div className="glass-card p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <span className="frosted-badge frosted-badge-emerald">
              <Sparkles size={11} />
              <span>Hyperlocal Community Supplies</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">
              Local Supplies & Essentials
            </h2>
            <p className="text-xs sm:text-[13px] text-[var(--ink-secondary)] max-w-sm leading-relaxed">
              Find emergency power, drinking water, first aid and rations within {user?.radiusKm || 3.5} km.
            </p>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="btn-pill btn-pill-emerald shrink-0 shadow-lg"
          >
            <Plus size={16} />
            <span>Offer Item</span>
          </button>
        </div>
      </div>

      {/* My Listings & Requested items */}
      {(mine.length > 0 || requested.length > 0) && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
            My Offers & Involvements
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

      {/* Frosted Filter Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto py-1 no-scrollbar">
        <div className="flex gap-1.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`btn-pill text-xs py-1.5 px-3.5 min-h-[34px] ${
              categoryFilter === 'all'
                ? 'btn-pill-primary font-bold'
                : 'btn-pill-secondary font-medium'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFreeOnly(!freeOnly)}
            className={`btn-pill text-xs py-1.5 px-3 min-h-[34px] ${
              freeOnly
                ? 'btn-pill-emerald font-bold'
                : 'btn-pill-secondary font-medium'
            }`}
          >
            Free Only
          </button>
          {TRADE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`btn-pill text-xs py-1.5 px-3 min-h-[34px] whitespace-nowrap ${
                categoryFilter === c.id
                  ? 'btn-pill-primary font-bold'
                  : 'btn-pill-secondary font-medium'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchListings}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-all active:scale-95 shadow-sm"
          title="Refresh Items"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Grid of items */}
      <div className="pt-0.5">
        {loading && nearby.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent mb-3" />
            <p className="text-xs font-semibold text-[var(--muted)]">
              Scanning local supplies nearby...
            </p>
          </div>
        ) : filteredNearby.length === 0 ? (
          <div className="glass-card p-8 sm:p-10 text-center flex flex-col items-center justify-center border-dashed">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] text-[var(--muted)] mb-3">
              <Package size={26} />
            </div>
            <h4 className="text-base font-bold text-[var(--ink)]">
              No Items Listed Yet
            </h4>
            <p className="mt-1 text-xs text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
              Be the first neighbour to offer spare drinking water, power banks, batteries or medical kits.
            </p>
            <button
              onClick={() => setShowPostModal(true)}
              className="mt-4 btn-pill btn-pill-emerald text-xs"
            >
              <Plus size={14} />
              <span>Offer an Essential Item</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
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
