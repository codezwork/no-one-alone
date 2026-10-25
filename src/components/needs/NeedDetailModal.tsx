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
  Flag,
  User,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
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
  const [showToast, setShowToast] = useState(false);

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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
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
  const role = need?.role;

  const posterName = need?.poster?.firstName || 'Neighbour';
  const helperName = need?.helper?.firstName || currentUser?.name?.split(' ')[0] || 'Local Responder';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xl animate-fade-in overflow-y-auto">
      {/* Floating Top Accountability Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 glass-modal px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-bold text-[var(--ink)] shadow-2xl animate-fade-in border border-black/10 dark:border-white/20">
          <Check size={14} className="stroke-[3] text-emerald-500" />
          <span>Responsibility Taken: You are assisting {posterName} • Broadcasted across 3.5 km</span>
        </div>
      )}

      {/* Apple Frosted Glass Modal Sheet */}
      <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col glass-modal my-auto overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              className={`frosted-badge ${
                need?.status === 'open'
                  ? 'frosted-badge-neutral font-bold'
                  : need?.status === 'taken'
                  ? 'frosted-badge-neutral font-bold border-neutral-400'
                  : 'frosted-badge-emerald'
              }`}
            >
              {need?.status === 'open'
                ? 'Open Need'
                : need?.status === 'taken'
                ? 'Helper En Route'
                : 'Resolved'}
            </span>

            {need?.distanceKm != null && (
              <span className="frosted-badge frosted-badge-distance">
                <MapPin size={11} className="shrink-0 text-current" />
                <span>{need.distanceKm} km away</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-black dark:border-white border-t-transparent" />
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
                  {error}
                </div>
              )}

              {/* Title & Situation */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
                  {need?.title}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap">
                  <span className="font-semibold text-[var(--ink)]">
                    Posted by {posterName}
                  </span>
                  {need?.poster?.professionLabel && (
                    <span>• {need.poster.professionLabel}</span>
                  )}
                  {need?.alone && (
                    <span className="frosted-badge frosted-badge-neutral font-bold text-[10px] py-0 px-2">
                      Living alone
                    </span>
                  )}
                </div>

                {need?.details && (
                  <p className="mt-3 rounded-2xl bg-[var(--glass-bg-subtle)] p-3.5 text-xs sm:text-[13px] text-[var(--ink-secondary)] leading-relaxed border border-[var(--glass-border-contrast)]">
                    {need.details}
                  </p>
                )}
              </div>

              {/* Landmark & Exact Door Address Card */}
              <div className="rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3.5 space-y-2 text-xs">
                {need?.landmark && (
                  <div className="flex items-start gap-2 text-[var(--ink)]">
                    <MapPin size={14} className="text-[var(--muted)] shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">Public Landmark:</strong> {need.landmark}
                    </span>
                  </div>
                )}

                {need?.address ? (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-700 dark:text-emerald-300">
                    <Lock size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">Exact Door Address (Unlocked):</strong>{' '}
                      {need.address}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] italic">
                    <Lock size={12} className="shrink-0" />
                    <span>Exact door address unlocks only upon accepting responsibility.</span>
                  </div>
                )}
              </div>

              {/* Locality Accountability State Banner */}
              {need?.status === 'taken' && (
                <div className="accountability-banner">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <Check size={13} className="stroke-[3]" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs text-[var(--ink)] leading-snug">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Responsibility Taken:
                    </span>{' '}
                    <span className="font-semibold">{helperName}</span> is assisting{' '}
                    <span className="font-semibold">{posterName}</span>
                    <span className="block text-[10.5px] text-[var(--muted)] mt-0.5">
                      Broadcasted across 3.5 km neighbourhood radius
                    </span>
                  </div>
                </div>
              )}

              {/* Visual Progress Stepper Tracker */}
              <div className="rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-[11px] shadow-sm">
                      1
                    </span>
                    <span className="text-[10px] text-[var(--ink)]">Posted</span>
                  </div>

                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      need?.takenAt ? 'bg-black dark:bg-white' : 'bg-[var(--line-2)]'
                    }`}
                  />

                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-[11px] shadow-sm ${
                        need?.takenAt
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-[var(--line-2)] text-[var(--muted)]'
                      }`}
                    >
                      2
                    </span>
                    <span className="text-[10px] text-[var(--ink)]">
                      {need?.helper ? `${helperName} Helping` : 'Claimed'}
                    </span>
                  </div>

                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      need?.resolvedAt ? 'bg-emerald-500' : 'bg-[var(--line-2)]'
                    }`}
                  />

                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-[11px] shadow-sm ${
                        need?.resolvedAt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[var(--line-2)] text-[var(--muted)]'
                      }`}
                    >
                      3
                    </span>
                    <span className="text-[10px] text-[var(--ink)]">Satisfied</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (Apple Frosted Pill Treatment) */}
              <div className="flex flex-col gap-2 pt-1">
                {/* Viewer can take request: Primary Action Button ("Take Responsibility / Help") */}
                {need?.status === 'open' && need?.canTake && (
                  <button
                    onClick={handleTake}
                    disabled={actionLoading}
                    className="btn-pill btn-pill-primary w-full py-3.5 text-sm font-bold shadow-lg"
                  >
                    <Heart size={15} className="shrink-0" />
                    <span>I Will Help / Claim Responsibility</span>
                  </button>
                )}

                {/* Refusal note if viewer cannot take */}
                {need?.status === 'open' && !need?.canTake && need?.refusal && role === 'viewer' && (
                  <div className="rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 text-center text-xs text-[var(--muted)]">
                    {need.refusal}
                  </div>
                )}

                {/* Helper action: Mark Resolved or Release */}
                {role === 'helper' && need?.status === 'taken' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleRelease}
                      disabled={actionLoading}
                      className="btn-pill btn-pill-secondary text-xs"
                    >
                      Can't Make It (Release)
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={actionLoading}
                      className="btn-pill btn-pill-primary text-xs font-bold"
                    >
                      <CheckCircle2 size={15} />
                      <span>Mark Satisfied</span>
                    </button>
                  </div>
                )}

                {/* Poster actions */}
                {role === 'poster' && need?.status === 'taken' && (
                  <button
                    onClick={handleResolve}
                    disabled={actionLoading}
                    className="btn-pill btn-pill-primary w-full py-3 text-sm font-bold shadow-md"
                  >
                    <CheckCircle2 size={16} />
                    <span>Mark Satisfied / Resolved</span>
                  </button>
                )}

                {role === 'poster' && need?.status === 'resolved' && !need?.thanked && (
                  <button
                    onClick={handleThank}
                    disabled={actionLoading}
                    className="btn-pill btn-pill-primary w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Heart size={15} className="fill-current text-rose-500" />
                    <span>Thank Helper</span>
                  </button>
                )}

                {role === 'poster' && ['open', 'taken'].includes(need?.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="text-center text-xs text-[var(--muted)] hover:text-rose-500 py-1 transition-colors"
                  >
                    Cancel request (no longer needed)
                  </button>
                )}
              </div>

              {/* IN-APP CHAT: Frosted Bubbles between Poster and Helper */}
              {(role === 'poster' || role === 'helper') && (
                <div className="mt-3 border-t border-[var(--line)] pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[var(--ink)]">
                      Direct Mutual Aid Chat
                    </h4>
                    <span className="text-[10px] text-[var(--muted)]">
                      Private between {posterName} & {helperName}
                    </span>
                  </div>

                  {/* Messages Bubble List */}
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 space-y-2 text-xs">
                    {messages.length === 0 ? (
                      <div className="text-center py-6 text-[var(--muted)] text-[11px]">
                        No messages yet. Share arrival updates or landmark directions.
                      </div>
                    ) : (
                      messages.map((m: any, i: number) => (
                        <div
                          key={i}
                          className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9.5px] text-[var(--muted)] mb-0.5 px-1">
                            {m.from}
                          </span>
                          <div
                            className={`rounded-2xl px-3.5 py-2 max-w-[82%] leading-relaxed ${
                              m.mine
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
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

                  {/* Chat Input Pill */}
                  <form onSubmit={handleSendMessage} className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !msgText.trim()}
                      className="btn-pill btn-pill-primary px-3.5 py-2 min-h-[36px] text-xs"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Report Modal */}
        {showReport && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl glass-modal p-5 space-y-3">
              <h3 className="text-sm font-bold text-[var(--ink)]">Report this Request</h3>
              <p className="text-xs text-[var(--muted)]">
                If 3 neighbours report a post, it will be automatically hidden from the feed.
              </p>
              <textarea
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason (e.g. spam, invalid, unsafe)..."
                className="w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowReport(false)}
                  className="btn-pill btn-pill-secondary text-xs py-1.5 px-3 min-h-[32px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="btn-pill btn-pill-primary text-xs py-1.5 px-3 min-h-[32px]"
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
