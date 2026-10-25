'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Tag,
  Package,
  Clock,
  CheckCircle2,
  Send,
  Flag,
  User,
  MessageCircle,
} from 'lucide-react';

interface ListingDetailModalProps {
  listingId: string | null;
  onClose: () => void;
  token: string;
  currentUser: any;
  onActionComplete: () => void;
}

export function ListingDetailModal({
  listingId,
  onClose,
  token,
  currentUser,
  onActionComplete,
}: ListingDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requestNote, setRequestNote] = useState('');
  const [msgText, setMsgText] = useState('');
  const [activeBuyerId, setActiveBuyerId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchDetail = async () => {
    if (!listingId || !token) return;
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (!activeBuyerId && d.requests?.length > 0) {
          setActiveBuyerId(d.requests[0].buyer.id);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 4000);
    return () => clearInterval(interval);
  }, [listingId, token]);

  if (!listingId) return null;

  const listing = data?.listing;
  const requests = data?.requests || [];
  const threads = data?.threads || [];
  const role = listing?.role;

  const handleRequest = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: requestNote.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to request item');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/listings/${listingId}/request`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (buyerId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ buyerId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to accept request');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseReservation = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/listings/${listingId}/release`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSold = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/listings/${listingId}/sold`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawListing = async () => {
    if (!confirm('Take down this listing?')) return;
    setActionLoading(true);
    try {
      await fetch(`/api/listings/${listingId}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      onClose();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    try {
      await fetch(`/api/listings/${listingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          body: msgText.trim(),
          buyerId: role === 'seller' ? activeBuyerId : undefined,
        }),
      });
      setMsgText('');
      await fetchDetail();
    } catch {
      /* ignore */
    }
  };

  const activeThread =
    role === 'seller'
      ? threads.find((t: any) => t.buyer?.id === activeBuyerId)
      : threads[0];
  const messages = activeThread?.messages || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col glass-modal my-auto overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              className={`frosted-badge ${
                listing?.free ? 'frosted-badge-emerald' : 'frosted-badge-neutral font-bold text-[var(--ink)]'
              }`}
            >
              {listing?.free ? 'FREE' : `₹${listing?.price}`}
            </span>
            <span className="text-xs text-[var(--muted)] capitalize">
              {listing?.categoryLabel} · {listing?.condition} condition
            </span>
          </div>

          <div className="flex items-center gap-2">
            {role === 'viewer' && (
              <button
                onClick={() => setShowReport(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-rose-500 transition-colors"
                title="Report Post"
              >
                <Flag size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent" />
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
                  {error}
                </div>
              )}

              {/* Photo */}
              {listing?.photo && (
                <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)]">
                  <img
                    src={listing.photo}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Title & Seller */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                  {listing?.title}
                </h2>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Offered by {listing?.seller?.firstName || 'Neighbour'}</span>
                  {listing?.distanceKm != null && (
                    <span className="frosted-badge frosted-badge-distance">
                      <MapPin size={11} className="shrink-0" />
                      <span>{listing.distanceKm} km away</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {listing?.description && (
                <div className="rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3.5 text-xs sm:text-[13px] text-[var(--ink-secondary)] leading-relaxed">
                  {listing.description}
                </div>
              )}

              {/* Status Notice */}
              {listing?.status === 'reserved' && (
                <div className="rounded-2xl border border-[var(--amber-border)] bg-[var(--amber-soft)] p-3 text-xs text-[var(--amber-ink)] flex items-center gap-2 font-semibold">
                  <Clock size={16} className="shrink-0" />
                  <span>
                    Currently reserved for{' '}
                    <strong>{listing?.buyer?.firstName || 'a neighbour'}</strong>.
                  </span>
                </div>
              )}

              {listing?.status === 'sold' && (
                <div className="rounded-2xl border border-[var(--emerald-border)] bg-[var(--emerald-soft)] p-3 text-xs text-[var(--emerald-ink)] flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>Handed over successfully to neighbour.</span>
                </div>
              )}

              {/* ACTIONS: VIEWER / BUYER */}
              {role !== 'seller' && (
                <div className="border-t border-[var(--line)] pt-3">
                  {!listing?.myRequest ? (
                    listing?.status === 'available' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={requestNote}
                          onChange={(e) => setRequestNote(e.target.value)}
                          placeholder="Note to neighbour (e.g. Can pick up in 20 mins)..."
                          className="w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
                        />
                        <button
                          onClick={handleRequest}
                          disabled={actionLoading}
                          className="btn-pill btn-pill-emerald w-full py-3 text-sm font-bold shadow-md"
                        >
                          <Package size={16} />
                          <span>Request This Item</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-[var(--muted)] py-2">
                        This item is currently reserved or handed over.
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-[var(--emerald-border)] bg-[var(--emerald-soft)] p-3 text-xs text-[var(--emerald-ink)] font-semibold">
                        You have requested this item. Message the neighbour below to coordinate pickup.
                      </div>
                      <button
                        onClick={handleWithdrawRequest}
                        disabled={actionLoading}
                        className="btn-pill btn-pill-secondary w-full text-xs"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS: SELLER */}
              {role === 'seller' && (
                <div className="border-t border-[var(--line)] pt-3 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
                      Requests Received ({requests.length})
                    </h4>
                    {requests.length === 0 ? (
                      <p className="text-xs text-[var(--muted)] italic">
                        No neighbours have requested this item yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {requests.map((r: any) => (
                          <div
                            key={r.buyer.id}
                            className={`flex items-center justify-between rounded-2xl border p-3 ${
                              r.accepted
                                ? 'border-[var(--amber-border)] bg-[var(--amber-soft)]'
                                : 'border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)]'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-[var(--ink)]">
                                {r.buyer.firstName}
                                {r.accepted && (
                                  <span className="frosted-badge frosted-badge-neutral text-[9.5px] py-0 px-2 ml-2 font-semibold text-[var(--ink)]">
                                    Reserved
                                  </span>
                                )}
                              </p>
                              {r.note && (
                                <p className="text-[11px] text-[var(--muted)] mt-0.5">"{r.note}"</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {listing.status === 'available' && (
                                <button
                                  onClick={() => handleAccept(r.buyer.id)}
                                  disabled={actionLoading}
                                  className="btn-pill btn-pill-emerald py-1 px-3 text-xs font-bold min-h-[30px]"
                                >
                                  Reserve
                                </button>
                              )}
                              <button
                                onClick={() => setActiveBuyerId(r.buyer.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)]"
                                title="Chat with buyer"
                              >
                                <MessageCircle size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Seller controls */}
                  <div className="pt-1 flex flex-col gap-2">
                    {listing.status === 'reserved' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleReleaseReservation}
                          disabled={actionLoading}
                          className="btn-pill btn-pill-secondary text-xs"
                        >
                          Release Hold
                        </button>
                        <button
                          onClick={handleMarkSold}
                          disabled={actionLoading}
                          className="btn-pill btn-pill-emerald text-xs font-bold shadow-md"
                        >
                          Mark Handed Over
                        </button>
                      </div>
                    )}

                    {listing.status !== 'sold' && (
                      <button
                        onClick={handleWithdrawListing}
                        disabled={actionLoading}
                        className="text-center text-xs text-[var(--muted)] hover:text-rose-500 py-1 transition-colors"
                      >
                        Take down listing
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CHAT THREAD (Buyer <-> Seller) */}
              {(listing?.myRequest || role === 'seller' || role === 'buyer') && (
                <div className="border-t border-[var(--line)] pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[var(--ink)]">
                      Chat with{' '}
                      {role === 'seller'
                        ? requests.find((r: any) => r.buyer.id === activeBuyerId)?.buyer?.firstName || 'Buyer'
                        : listing?.seller?.firstName || 'Seller'}
                    </h4>
                    <span className="text-[10px] text-[var(--muted)]">Arrange pickup spot</span>
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 space-y-2 text-xs">
                    {messages.length === 0 ? (
                      <div className="text-center py-5 text-[var(--muted)] text-[11px]">
                        No messages yet. Send a message to coordinate pickup timing.
                      </div>
                    ) : (
                      messages.map((m: any, i: number) => (
                        <div
                          key={i}
                          className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9.5px] text-[var(--muted)] mb-0.5 px-1">{m.from}</span>
                          <div
                            className={`rounded-2xl px-3.5 py-2 max-w-[82%] leading-relaxed ${
                              m.mine
                                ? 'bg-[var(--emerald)] text-white shadow-sm'
                                : 'bg-[var(--glass-bg-elevated)] text-[var(--ink)] border border-[var(--glass-border-contrast)] shadow-sm'
                            }`}
                          >
                            {m.body}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder="Type a pickup note..."
                      className="flex-1 rounded-full border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
                    />
                    <button
                      type="submit"
                      disabled={!msgText.trim()}
                      className="btn-pill btn-pill-emerald px-3.5 py-2 min-h-[36px] text-xs font-bold shadow-sm"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
