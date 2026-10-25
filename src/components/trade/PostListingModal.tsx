'use client';
import React, { useState } from 'react';
import { X, PackagePlus, Camera, Tag, IndianRupee, Send } from 'lucide-react';
import { TRADE_CATEGORIES } from '@/lib/rules';

interface PostListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onListingCreated: () => void;
}

export function PostListingModal({
  isOpen,
  onClose,
  token,
  onListingCreated,
}: PostListingModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('food');
  const [condition, setCondition] = useState('good');
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState<number>(100);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 350 * 1024) {
      setError('Please choose a photo under 350 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter what you are offering.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          condition,
          free,
          price: free ? undefined : price,
          description: description.trim() || undefined,
          photo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to post item');
      onListingCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="rounded-2xl bg-emerald-500/20 p-2.5 text-emerald-400">
            <PackagePlus size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Offer an Essential Item</h2>
            <p className="text-xs text-slate-400">Share or trade supplies locally with neighbours</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center">
            <label className="group relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 hover:border-emerald-500 transition-colors">
              {photo ? (
                <img src={photo} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400">
                  <Camera size={26} />
                  <span className="text-xs mt-1.5 font-medium">Add Photo (Optional)</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300">What are you offering?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5L Mineral Water Can, Powerbank 20000mAh, Baby Diapers"
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {TRADE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Condition</label>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {['new', 'good', 'used'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                      condition === c
                        ? 'border-emerald-500 bg-emerald-500/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price / Free Toggle */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Pricing</span>
              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => setFree(true)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    free ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
                  }`}
                >
                  Give for Free
                </button>
                <button
                  type="button"
                  onClick={() => setFree(false)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    !free ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400'
                  }`}
                >
                  Set Price
                </button>
              </div>
            </div>

            {!free && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-white">
                  <span className="text-slate-400 mr-1">₹</span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-24 bg-transparent font-bold text-white focus:outline-none"
                  />
                </div>
                <span className="text-xs text-slate-400">Payment arranged directly in person</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300">Notes / Details</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Unopened seal, expiry Nov 2027, pickup from ground floor lobby..."
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send size={16} />
                <span>List Item for Neighbours</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
