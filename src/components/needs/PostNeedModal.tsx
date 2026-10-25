'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  Stethoscope,
  Users,
  ShieldCheck,
  MapPin,
  Lock,
  Send,
} from 'lucide-react';
import { PROFESSIONS, GENERAL_HELP } from '@/lib/rules';

interface PostNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onNeedCreated: () => void;
}

export function PostNeedModal({ isOpen, onClose, token, onNeedCreated }: PostNeedModalProps) {
  const [kind, setKind] = useState<'professional' | 'general'>('professional');
  const [profession, setProfession] = useState('doctor');
  const [category, setCategory] = useState('meal');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [alone, setAlone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isSensitive, setIsSensitive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live audience calculation preview
  useEffect(() => {
    if (!isOpen || !token) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/needs/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            kind,
            profession: kind === 'professional' ? profession : undefined,
            category: kind === 'general' ? category : undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewCount(data.count);
          setIsSensitive(data.sensitive);
        }
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, token, kind, profession, category]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/needs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind,
          profession: kind === 'professional' ? profession : undefined,
          category: kind === 'general' ? category : undefined,
          title: title.trim() || undefined,
          details: details.trim() || undefined,
          landmark: landmark.trim() || undefined,
          address: address.trim() || undefined,
          alone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to post request');
      onNeedCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const requestableProfessions = PROFESSIONS.filter((p) => p.requestable);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg glass-modal p-6 sm:p-7 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black dark:bg-white text-white dark:text-black border border-black/10 dark:border-white/20 shadow-sm">
            <HeartHandshake size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)]">
              Post an Urgent Request
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Alerts matching neighbours within your 3–4 km locality circle
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Frosted Sliding Pill Toggle for Kind */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">What kind of help is needed?</label>
            <div className="mt-1.5 flex rounded-full bg-[var(--glass-bg-subtle)] p-1 border border-[var(--glass-border-contrast)]">
              <button
                type="button"
                onClick={() => setKind('professional')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-all ${
                  kind === 'professional'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Stethoscope size={14} />
                <span>Professional</span>
              </button>
              <button
                type="button"
                onClick={() => setKind('general')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-all ${
                  kind === 'general'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Users size={14} />
                <span>General Mutual Aid</span>
              </button>
            </div>
          </div>

          {/* Profession or Category Selector */}
          {kind === 'professional' ? (
            <div>
              <label className="text-xs font-bold text-[var(--ink)]">Choose Required Skill</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              >
                {requestableProfessions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-[var(--ink)]">Choose General Need Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              >
                {GENERAL_HELP.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Audience Hint in Frosted Pill */}
          <div className="rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 text-xs text-[var(--ink)] flex items-center justify-between font-semibold shadow-sm">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>
                {previewCount != null
                  ? `${previewCount} qualified neighbour${previewCount === 1 ? '' : 's'} in range`
                  : 'Calculating locality audience...'}
              </span>
            </span>
            {isSensitive && (
              <span className="frosted-badge frosted-badge-danger text-[10px] py-0 px-2">
                Safety Guard Active
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">Brief Summary</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ground floor waterlogging, need pump or suction advice"
              className="mt-1.5 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs sm:text-sm text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* Details */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">Details & Situation</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what help you need and what the situation is..."
              className="mt-1.5 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white leading-relaxed"
            />
          </div>

          {/* Landmark & Private Door Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-[var(--ink)]">
                <MapPin size={12} className="text-[var(--muted)]" />
                <span>Public Landmark</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near 2nd cross road temple"
                className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-3.5 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <span className="text-[10px] text-[var(--muted)]">Visible to all nearby</span>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-[var(--ink)]">
                <Lock size={12} className="text-[var(--muted)]" />
                <span>Private Door / Flat</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. #42, 2nd Floor, Apt B"
                className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-3.5 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <span className="text-[10px] text-[var(--muted)] font-semibold">Strictly private until helper accepts</span>
            </div>
          </div>

          {/* Alone Checkbox */}
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 cursor-pointer hover:bg-[var(--glass-bg-elevated)] transition-colors">
            <input
              type="checkbox"
              checked={alone}
              onChange={(e) => setAlone(e.target.checked)}
              className="h-4 w-4 rounded border-slate-400 accent-black dark:accent-white"
            />
            <div className="text-xs">
              <span className="font-bold text-[var(--ink)]">I am living alone / alone right now</span>
              <p className="text-[var(--muted)] text-[11px]">Helps neighbours prioritize and give extra attention.</p>
            </div>
          </label>

          {/* Submit Frosted Pill Button: Minimalist Black & White */}
          <button
            type="submit"
            disabled={loading}
            className="btn-pill btn-pill-primary w-full py-3.5 text-sm font-bold shadow-lg"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Send size={15} />
                <span>Post Request & Alert Locality</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
