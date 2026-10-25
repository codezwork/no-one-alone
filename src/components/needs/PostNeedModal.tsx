'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  Stethoscope,
  Users,
  ShieldCheck,
  AlertCircle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-rose-500/20 p-2.5 text-rose-500">
            <HeartHandshake size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Ask for Urgent Help</h2>
            <p className="text-xs text-slate-400">Alerts qualified neighbours within your radius</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Kind Toggle */}
          <div>
            <label className="text-xs font-semibold text-slate-300">What kind of help is needed?</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind('professional')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  kind === 'professional'
                    ? 'border-rose-500 bg-rose-500/20 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Stethoscope size={16} />
                <span>Professional</span>
              </button>
              <button
                type="button"
                onClick={() => setKind('general')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  kind === 'general'
                    ? 'border-rose-500 bg-rose-500/20 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Users size={16} />
                <span>General Neighbour</span>
              </button>
            </div>
          </div>

          {/* Profession or Category Selector */}
          {kind === 'professional' ? (
            <div>
              <label className="text-xs font-semibold text-slate-300">Choose Required Profession</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
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
              <label className="text-xs font-semibold text-slate-300">Choose Kind of General Help</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
              >
                {GENERAL_HELP.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Audience Hint */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} />
              <span>
                {previewCount != null
                  ? `${previewCount} qualified neighbour${previewCount === 1 ? '' : 's'} in range`
                  : 'Calculating nearby audience...'}
              </span>
            </span>
            {isSensitive && (
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                Safety Filter Active
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300">Short Summary</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water entering ground floor, need pump advice"
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Details */}
          <div>
            <label className="text-xs font-semibold text-slate-300">Details / Situation</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what you need and what the situation is..."
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Landmark & Private Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                <MapPin size={12} className="text-rose-400" />
                <span>Public Landmark</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near 2nd cross road bakery"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Visible to all nearby</span>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                <Lock size={12} className="text-amber-400" />
                <span>Private Address / Door</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. #42 Flat 3B"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <span className="text-[10px] text-amber-400">Strictly private until helper accepts</span>
            </div>
          </div>

          {/* Alone Checkbox */}
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 p-3 cursor-pointer hover:bg-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={alone}
              onChange={(e) => setAlone(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 accent-rose-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-white">I am living alone / alone right now</span>
              <p className="text-slate-400 text-[11px]">Helps helpers prioritize and take extra care.</p>
            </div>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/50 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send size={16} />
                <span>Post Request & Alert Neighbours</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
