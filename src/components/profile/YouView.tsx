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
} from 'lucide-react';
import { MIN_RADIUS_KM, MAX_RADIUS_KM } from '@/lib/rules';

interface YouViewProps {
  user: any;
  token: string;
  onUserUpdated: (user: any) => void;
  onSignOut: () => void;
}

export function YouView({ user, token, onUserUpdated, onSignOut }: YouViewProps) {
  const [radius, setRadius] = useState<number>(user?.radiusKm || 4);
  const [updatingRadius, setUpdatingRadius] = useState(false);
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
        setStatusMsg(`Radius updated to ${newRadius} km.`);
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
            : 'Location updated with phone GPS.'
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
    <div className="space-y-4 px-4 py-4 animate-fade-in pb-10">
      {/* Profile Header Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white font-black text-2xl shadow-lg">
            {user?.photo ? (
              <img src={user.photo} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.[0] || 'N'
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{user?.name}</h2>
            <p className="text-xs font-semibold text-rose-400">
              {user?.professionLabel || 'Neighbour'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
              {user?.age} yrs · {user?.gender} · {user?.marital}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 p-2.5">
            <Award size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Helped</p>
              <p className="text-sm font-bold text-white">{user?.helped || 0} neighbours</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 p-2.5">
            <Heart size={18} className="text-rose-500 shrink-0 fill-rose-500/20" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Thanks</p>
              <p className="text-sm font-bold text-white">{user?.thanks || 0} received</p>
            </div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <Check size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Radius Setting */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-rose-400" />
            <h3 className="text-sm font-bold text-white">Neighbourhood Radius</h3>
          </div>
          <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs font-bold text-rose-300">
            {radius} km
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          How far requests and essential supplies reach you. In dense city areas during floods, 3–4 km is usually best.
        </p>
        <input
          type="range"
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full accent-rose-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>{MIN_RADIUS_KM} km</span>
          <span>4 km (default)</span>
          <span>{MAX_RADIUS_KM} km</span>
        </div>
      </div>

      {/* Location Update */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">GPS Location</h3>
          </div>
          {user?.lat && (
            <span className="text-[10px] text-slate-400">
              {Number(user.lat).toFixed(4)}, {Number(user.lng).toFixed(4)}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Update your location if you moved to a shelter, relief camp, or another neighborhood.
        </p>
        <button
          onClick={handleUpdateLocation}
          disabled={updatingLoc}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {updatingLoc ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <MapPin size={14} className="text-rose-400" />
              <span>Update to Current GPS</span>
            </>
          )}
        </button>
      </div>

      {/* Recovery Code Card */}
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-amber-400">
          <Key size={18} />
          <h3 className="text-sm font-bold text-white">Your Recovery Code</h3>
        </div>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Keep this code safe to sign in on other devices:
        </p>
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-black/60 p-3 font-mono text-xs text-amber-300">
          <span className="select-all break-all">{token}</span>
          <button
            onClick={handleCopyCode}
            className="ml-2 flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 shrink-0"
          >
            {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Account actions */}
      <div className="pt-2 space-y-2">
        <button
          onClick={onSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} />
          <span>Switch Account / Sign Out</span>
        </button>

        <button
          onClick={handleDeleteAccount}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2 text-xs font-semibold text-rose-500/80 hover:text-rose-400 transition-colors"
        >
          <Trash2 size={14} />
          <span>Delete Account</span>
        </button>
      </div>
    </div>
  );
}
