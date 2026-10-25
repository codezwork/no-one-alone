'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Lock,
  Clock,
  CheckCircle2,
  Heart,
  Send,
  AlertTriangle,
  Flag,
  User,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface NeedDetailModalProps {
  needId: string | null;
  onClose: () => void;
  token: string;
  currentUser: any;
  onActionComplete: () => void;
}

export function NeedDetailModal({
  needId,
  onClose,
  token,
  currentUser,
  onActionComplete,
}: NeedDetailModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchDetail = async () => {
    if (!needId || !token) return;
    try {
      const res = await fetch(`/api/needs/${needId}`, {
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
    fetchDetail();
    const interval = setInterval(fetchDetail, 4000);
    return () => clearInterval(interval);
  }, [needId, token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  if (!needId) return null;

  const handleTake = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/needs/${needId}/take`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to take request');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!confirm('Are you sure you want to release this request? It will be reopened to other neighbours.')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/needs/${needId}/release`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to release request');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/needs/${needId}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to resolve request');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this request? It will be closed and removed from active feeds.')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/needs/${needId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to cancel request');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleThank = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/needs/${needId}/thank`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || 'Failed to send thanks');
      await fetchDetail();
      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await fetch(`/api/needs/${needId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      alert('Thank you for reporting. This post will be hidden if 3 neighbours report it.');
      setShowReport(false);
      onClose();
      onActionComplete();
    } catch {
      /* ignore */
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/needs/${needId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: msgText.trim() }),
      });
      if (res.ok) {
        setMsgText('');
        await fetchDetail();
      }
    } catch {
      /* ignore */
    } finally {
      setSendingMsg(false);
    }
  };

  const need = data?.need;
  const messages = data?.messages || [];
  const events = data?.events || [];
  const role = need?.role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-800 bg-[#0f172a] shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                need?.status === 'open'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  : need?.status === 'taken'
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              {need?.status === 'open' ? 'Open Request' : need?.status === 'taken' ? 'In Progress' : 'Resolved'}
            </span>
            {need?.distanceKm != null && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={12} className="text-rose-400" />
                <span>{need.distanceKm} km away</span>
              </span>
            )}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading && !data ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Title & Situation */}
              <div>
                <h2 className="text-xl font-bold text-white">{need?.title}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>Asked by {need?.poster?.firstName || 'Neighbour'}</span>
                  {need?.poster?.professionLabel && (
                    <span>· {need.poster.professionLabel}</span>
                  )}
                  {need?.alone && (
                    <span className="rounded bg-orange-500/20 px-1.5 py-0.2 text-[10px] font-bold text-orange-300">
                      Living alone
                    </span>
                  )}
                </div>
                {need?.details && (
                  <p className="mt-3 rounded-2xl bg-slate-900/60 p-4 text-xs text-slate-300 leading-relaxed border border-slate-800/80">
                    {need.details}
                  </p>
                )}
              </div>

              {/* Landmark & Address Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2 text-xs">
                {need?.landmark && (
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <span><strong>Public hint:</strong> {need.landmark}</span>
                  </div>
                )}
                {need?.address ? (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-200">
                    <Lock size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Exact Door / Address:</strong> {need.address}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic">
                    <Lock size={12} />
                    <span>Exact address is hidden until a helper is accepted.</span>
                  </div>
                )}
              </div>

              {/* Status Stepper Tracker */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Progress Tracker
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-xs">
                      1
                    </span>
                    <span className="text-[10px] text-slate-300">Posted</span>
                  </div>
                  <div className={`h-0.5 flex-1 mx-2 ${need?.takenAt ? 'bg-amber-500' : 'bg-slate-800'}`} />
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
                        need?.takenAt
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      2
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {need?.helper ? `${need.helper.firstName} Helping` : 'Taken'}
                    </span>
                  </div>
                  <div className={`h-0.5 flex-1 mx-2 ${need?.resolvedAt ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
                        need?.resolvedAt
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      3
                    </span>
                    <span className="text-[10px] text-slate-300">Resolved</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col gap-2 pt-1">
                {/* Viewer can take request */}
                {need?.status === 'open' && need?.canTake && (
                  <button
                    onClick={handleTake}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/50 hover:opacity-90 disabled:opacity-50"
                  >
                    <Heart size={16} />
                    <span>I Can Help with This Request</span>
                  </button>
                )}

                {/* Refusal text if viewer cannot take */}
                {need?.status === 'open' && !need?.canTake && need?.refusal && role === 'viewer' && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center text-xs text-slate-400">
                    {need.refusal}
                  </div>
                )}

                {/* Helper action: Mark Resolved or Release */}
                {role === 'helper' && need?.status === 'taken' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleRelease}
                      disabled={actionLoading}
                      className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      Can't Make It (Release)
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={actionLoading}
                      className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}

                {/* Poster actions */}
                {role === 'poster' && need?.status === 'taken' && (
                  <button
                    onClick={handleResolve}
                    disabled={actionLoading}
                    className="rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-500"
                  >
                    Mark Resolved
                  </button>
                )}

                {role === 'poster' && need?.status === 'resolved' && !need?.thanked && (
                  <button
                    onClick={handleThank}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md hover:bg-rose-500"
                  >
                    <Heart size={16} className="fill-white" />
                    <span>Thank Helper ❤️</span>
                  </button>
                )}

                {role === 'poster' && ['open', 'taken'].includes(need?.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="text-center text-xs text-slate-500 hover:text-rose-400 py-1 transition-colors"
                  >
                    Cancel request (no longer needed)
                  </button>
                )}
              </div>

              {/* IN-APP CHAT (Between Poster and Helper) */}
              {(role === 'poster' || role === 'helper') && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                    <span>Direct In-App Chat</span>
                    <span className="text-[10px] text-slate-400 font-normal">Private between you both</span>
                  </h4>

                  {/* Messages list */}
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
                    {messages.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-[11px]">
                        No messages yet. Say hello or share landmark instructions.
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
                                ? 'bg-rose-600 text-white rounded-br-none'
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

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !msgText.trim()}
                      className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-rose-500 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Report Modal */}
        {showReport && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-bold text-white">Report this Request</h3>
              <p className="mt-1 text-xs text-slate-400">
                If 3 neighbours report a post, it is hidden from the feed automatically.
              </p>
              <textarea
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason (e.g. spam, invalid, unsafe)..."
                className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setShowReport(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
