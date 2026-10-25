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

  // Find active chat messages
  const activeThread =
    role === 'seller'
      ? threads.find((t: any) => t.buyer?.id === activeBuyerId)
      : threads[0];
  const messages = activeThread?.messages || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-800 bg-[#0f172a] shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                listing?.free
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 text-white'
              }`}
            >
              {listing?.free ? 'FREE' : `₹${listing?.price}`}
            </span>
            <span className="text-xs text-slate-400 capitalize">
              {listing?.categoryLabel} · {listing?.condition} condition
            </span>
          </div>

          <div className="flex items-center gap-2">
            {role === 'viewer' && (
              <button
                onClick={() => setShowReport(true)}
                className="rounded-full p-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Report Post"
              >
                <Flag size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Photo if exists */}
              {listing?.photo && (
                <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-black">
                  <img
                    src={listing.photo}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Title & Seller */}
              <div>
                <h2 className="text-xl font-bold text-white">{listing?.title}</h2>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Offered by {listing?.seller?.firstName || 'Neighbour'}</span>
                  {listing?.distanceKm != null && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin size={12} className="text-emerald-400" />
                      <span>{listing.distanceKm} km away</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {listing?.description && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-300 leading-relaxed">
                  {listing.description}
                </div>
              )}

              {/* Status Notice */}
              {listing?.status === 'reserved' && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center gap-2">
                  <Clock size={16} className="shrink-0" />
                  <span>
                    Currently reserved for{' '}
                    <strong>{listing?.buyer?.firstName || 'a neighbour'}</strong>.
                  </span>
                </div>
              )}

              {listing?.status === 'sold' && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Handed over successfully.</span>
                </div>
              )}

              {/* ACTIONS: VIEWER / BUYER */}
              {role !== 'seller' && (
                <div className="border-t border-slate-800 pt-3">
                  {!listing?.myRequest ? (
                    listing?.status === 'available' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={requestNote}
                          onChange={(e) => setRequestNote(e.target.value)}
                          placeholder="Note to seller (e.g. Can pick up in 20 mins)..."
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          onClick={handleRequest}
                          disabled={actionLoading}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <Package size={16} />
                          <span>I Want This Item</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-slate-500 py-2">
                        This item is currently reserved or handed over.
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                        You have asked for this item. Message the seller below to arrange pickup.
                      </div>
                      <button
                        onClick={handleWithdrawRequest}
                        disabled={actionLoading}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS: SELLER */}
              {role === 'seller' && (
                <div className="border-t border-slate-800 pt-3 space-y-3">
                  {/* Requests received */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Requests Received ({requests.length})
                    </h4>
                    {requests.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        No neighbours have requested this item yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {requests.map((r: any) => (
                          <div
                            key={r.buyer.id}
                            className={`flex items-center justify-between rounded-xl border p-3 ${
                              r.accepted
                                ? 'border-amber-500/40 bg-amber-500/10'
                                : 'border-slate-800 bg-slate-900/60'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-white">
                                {r.buyer.firstName}
                                {r.accepted && (
                                  <span className="ml-2 rounded bg-amber-500/30 px-1.5 py-0.2 text-[10px] text-amber-300">
                                    Reserved
                                  </span>
                                )}
                              </p>
                              {r.note && (
                                <p className="text-[11px] text-slate-400 mt-0.5">"{r.note}"</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {listing.status === 'available' && (
                                <button
                                  onClick={() => handleAccept(r.buyer.id)}
                                  disabled={actionLoading}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                                >
                                  Reserve
                                </button>
                              )}
                              <button
                                onClick={() => setActiveBuyerId(r.buyer.id)}
                                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                                title="Chat with buyer"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Seller controls */}
                  <div className="pt-2 flex flex-col gap-2">
                    {listing.status === 'reserved' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleReleaseReservation}
                          disabled={actionLoading}
                          className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                        >
                          Release Reservation
                        </button>
                        <button
                          onClick={handleMarkSold}
                          disabled={actionLoading}
                          className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md"
                        >
                          Mark Handed Over
                        </button>
                      </div>
                    )}

                    {listing.status !== 'sold' && (
                      <button
                        onClick={handleWithdrawListing}
                        disabled={actionLoading}
                        className="text-center text-xs text-slate-500 hover:text-rose-400 py-1 transition-colors"
                      >
                        Take down listing
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CHAT THREAD (Buyer <-> Seller) */}
              {(listing?.myRequest || role === 'seller' || role === 'buyer') && (
                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                    <span>
                      Chat with{' '}
                      {role === 'seller'
                        ? requests.find((r: any) => r.buyer.id === activeBuyerId)?.buyer?.firstName || 'Buyer'
                        : listing?.seller?.firstName || 'Seller'}
                    </span>
                    <span className="text-[10px] text-slate-400">Arrange pickup</span>
                  </h4>

                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
                    {messages.length === 0 ? (
                      <div className="text-center py-5 text-slate-500 text-[11px]">
                        No messages yet. Send a message to agree on a time and spot.
                      </div>
                    ) : (
                      messages.map((m: any, i: number) => (
                        <div
                          key={i}
                          className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-slate-500 mb-0.5">{m.from}</span>
                          <div
                            className={`rounded-2xl px-3.5 py-2 max-w-[80%] leading-relaxed ${
                              m.mine
                                ? 'bg-emerald-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-200 rounded-bl-none'
                            }`}
                          >
                            {m.body}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder="Type a pickup message..."
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!msgText.trim()}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      <Send size={14} />
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
