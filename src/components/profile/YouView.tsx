'use client';
import React, { useState } from 'react';
import {
  User,
  Heart,
  Award,
  MapPin,
  Key,
  LogOut,
  Trash2,
  Sliders,
  ShieldCheck,
  Check,
  Copy,
  Navigation,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { MIN_RADIUS_KM, MAX_RADIUS_KM } from '@/lib/rules';
import { useTheme } from '@/lib/theme';

interface YouViewProps {
  user: any;
  token: string;
  onUserUpdated: (user: any) => void;
  onSignOut: () => void;
}

export function YouView({ user, token, onUserUpdated, onSignOut }: YouViewProps) {
  const [radius, setRadius] = useState<number>(user?.radiusKm || 3.5);
  const [updatingRadius, setUpdatingRadius] = useState(false);
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();

  const handleRadiusChange = async (newRadius: number) => {
    setRadius(newRadius);
    setUpdatingRadius(true);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ radiusKm: newRadius }),
      });
      if (res.ok) {
        const d = await res.json();
        onUserUpdated(d.user);
        setStatusMsg(`Locality radius updated to ${newRadius} km.`);
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch {
      /* ignore */
    } finally {
      setUpdatingRadius(false);
    }
  };

  const handleUpdateLocation = async () => {
    setUpdatingLoc(true);
    setStatusMsg(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 6000 });
      });
      const res = await fetch('/api/me/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        onUserUpdated(d.user);
        setStatusMsg(
          d.alerted > 0
            ? `Location updated! ${d.alerted} open request${d.alerted === 1 ? '' : 's'} now in range.`
            : 'Location updated via GPS.'
        );
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch {
      alert('Could not access GPS. Please check location permissions in your browser.');
    } finally {
      setUpdatingLoc(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? All your requests and data will be removed.')) return;
    try {
      await fetch('/api/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onSignOut();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Profile Header Frosted Glass Card */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-2xl shadow-md">
            {user?.photo ? (
              <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.[0] || 'U'
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--ink)] truncate">
                {user?.name}
              </h2>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <Check size={10} className="stroke-[3]" />
              </span>
            </div>

            <p className="text-xs font-semibold text-[var(--muted)] mt-0.5">
              {user?.professionLabel || 'Community Member'}
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 capitalize">
              {user?.age} yrs · {user?.gender} · {user?.marital}
            </p>
          </div>
        </div>

        {/* Stats Row in Frosted Glass */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--line)] pt-3.5">
          <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] p-3">
            <Award size={18} className="text-[var(--ink)] shrink-0" />
            <div>
              <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">
                Helped
              </p>
              <p className="text-sm font-bold text-[var(--ink)]">
                {user?.helped || 0} neighbours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] p-3">
            <Heart size={18} className="text-rose-500 shrink-0 fill-rose-500/20" />
            <div>
              <p className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">
                Thanks
              </p>
              <p className="text-sm font-bold text-[var(--ink)]">
                {user?.thanks || 0} received
              </p>
            </div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3.5 text-xs text-[var(--ink)] font-semibold flex items-center gap-2 shadow-sm">
          <Check size={15} className="text-emerald-500 stroke-[3]" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* APPEARANCE / THEME SWITCH (CRITICAL USER REQUIREMENT) */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun size={17} className="text-[var(--ink)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Appearance & Theme</h3>
          </div>
          <span className="frosted-badge frosted-badge-neutral text-[10px] capitalize">
            {theme === 'system' ? 'System Theme' : `${theme} Mode`}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Switch between visionOS Frosted Light and Dark mode to match your comfort and environment.
        </p>

        {/* Sliding Frosted Segmented Pill Switch */}
        <div className="flex rounded-full bg-[var(--glass-bg-subtle)] p-1 border border-[var(--glass-border-contrast)]">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
              theme === 'light'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Sun size={14} />
            <span>Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
              theme === 'dark'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Moon size={14} />
            <span>Dark</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
              theme === 'system'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Laptop size={14} />
            <span>Auto</span>
          </button>
        </div>
      </div>

      {/* Neighbourhood Radius Setting (3-4 km Zone) */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={17} className="text-[var(--ink)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Hyperlocal Radius</h3>
          </div>
          <span className="frosted-badge frosted-badge-distance">
            {radius} km
          </span>
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          How far community requests and supplies reach you. During floods and calamities, 3–4 km is optimal for rapid mutual aid.
        </p>
        <input
          type="range"
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          step={0.5}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full accent-black dark:accent-white cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[var(--muted)]">
          <span>{MIN_RADIUS_KM} km</span>
          <span className="font-bold text-[var(--ink)]">3.5–4 km (calamity zone)</span>
          <span>{MAX_RADIUS_KM} km</span>
        </div>
      </div>

      {/* GPS Location Update Card */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation size={17} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-[var(--ink)]">GPS Coordinates</h3>
          </div>
          {user?.lat && (
            <span className="text-[10px] text-[var(--muted)] font-mono">
              {Number(user.lat).toFixed(4)}, {Number(user.lng).toFixed(4)}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Update if you moved to a relief shelter, higher ground, or another locality block.
        </p>
        <button
          onClick={handleUpdateLocation}
          disabled={updatingLoc}
          className="btn-pill btn-pill-secondary w-full text-xs font-semibold shadow-sm"
        >
          {updatingLoc ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
          ) : (
            <>
              <MapPin size={14} className="text-[var(--muted)]" />
              <span>Update to Current GPS Location</span>
            </>
          )}
        </button>
      </div>

      {/* Recovery Code Card */}
      <div className="glass-card p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <Key size={17} />
          <h3 className="text-sm font-bold text-[var(--ink)]">Your Safe Recovery Code</h3>
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Save this code to sign in to No One Alone on your other devices:
        </p>
        <div className="flex items-center justify-between rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 font-mono text-xs text-[var(--ink)]">
          <span className="select-all break-all font-bold">{token}</span>
          <button
            onClick={handleCopyCode}
            className="ml-2 btn-pill btn-pill-secondary py-1 px-2.5 min-h-[30px] text-xs font-bold shrink-0"
          >
            {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Account actions */}
      <div className="pt-2 space-y-2">
        <button
          onClick={onSignOut}
          className="btn-pill btn-pill-secondary w-full py-3 text-xs font-bold"
        >
          <LogOut size={15} />
          <span>Switch Account / Sign Out</span>
        </button>

        <button
          onClick={handleDeleteAccount}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
        >
          <Trash2 size={13} />
          <span>Delete Account</span>
        </button>
      </div>
    </div>
  );
}
