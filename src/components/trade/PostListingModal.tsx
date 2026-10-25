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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg glass-modal p-6 sm:p-7 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--emerald-soft)] text-[var(--emerald)] border border-[var(--emerald-border)] shadow-sm">
            <PackagePlus size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)]">
              Offer Essential Supplies
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Share or trade items with neighbours within 3–4 km
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center">
            <label className="group relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--line-2)] bg-[var(--glass-bg-subtle)] hover:border-[var(--emerald)] transition-colors">
              {photo ? (
                <img src={photo} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-[var(--muted)] group-hover:text-[var(--emerald)]">
                  <Camera size={26} />
                  <span className="text-xs mt-1.5 font-semibold">Add Photo (Optional)</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">Item Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 20L Filtered Drinking Water Can, 20,000mAh Power Bank"
              className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs sm:text-sm text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]"
            >
              {TRADE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price / Free Toggle in Frosted Sliding Pill */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">Pricing</label>
            <div className="mt-1 flex rounded-full bg-[var(--glass-bg-subtle)] p-1 border border-[var(--glass-border-contrast)]">
              <button
                type="button"
                onClick={() => setFree(true)}
                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                  free
                    ? 'bg-[var(--glass-bg-elevated)] text-[var(--emerald)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                Free / Calamity Aid
              </button>
              <button
                type="button"
                onClick={() => setFree(false)}
                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
                  !free
                    ? 'bg-[var(--glass-bg-elevated)] text-[var(--ink)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                Set Fixed Price (₹)
              </button>
            </div>

            {!free && (
              <div className="mt-2 flex items-center rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5">
                <span className="text-sm font-bold text-[var(--ink)] mr-2">₹</span>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="Price in rupees"
                  className="w-full bg-transparent text-sm font-bold text-[var(--ink)] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[var(--ink)]">Description & Handover Note</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Unopened container, available for pickup near bus stop..."
              className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)] leading-relaxed"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-pill btn-pill-emerald w-full py-3.5 text-sm font-bold shadow-lg"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send size={15} />
                <span>List Item for Locality</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
