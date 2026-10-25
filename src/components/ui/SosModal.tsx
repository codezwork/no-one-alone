'use client';
import React from 'react';
import { Phone, ShieldAlert, X } from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELPLINES = [
  { name: 'National Emergency Number', number: '112', desc: 'Police, Fire, Ambulance 24x7', color: 'from-rose-500 to-red-600' },
  { name: 'Disaster Management (NDRF)', number: '011-24363260', desc: 'Flood, Cyclone, Calamity rescue', color: 'from-amber-500 to-orange-600' },
  { name: 'Medical Emergency / Ambulance', number: '108', desc: 'Emergency medical transport', color: 'from-emerald-500 to-teal-600' },
  { name: 'Childline', number: '1098', desc: 'Emergency assistance for children', color: 'from-blue-500 to-cyan-600' },
  { name: 'Women Helpline', number: '1091', desc: '24x7 distress helpline', color: 'from-purple-500 to-pink-600' },
];

export function SosModal({ isOpen, onClose }: SosModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 text-rose-500">
          <div className="rounded-xl bg-rose-500/20 p-2.5">
            <ShieldAlert size={28} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Emergency Helplines</h2>
            <p className="text-xs text-rose-400">Direct dial emergency services in India</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {HELPLINES.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-3.5 transition-all hover:border-slate-700 hover:bg-slate-800 active:scale-[0.98]"
            >
              <div>
                <p className="text-sm font-semibold text-white">{h.name}</p>
                <p className="text-xs text-slate-400">{h.desc}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white shadow-lg shadow-rose-900/40">
                <Phone size={14} />
                <span>{h.number}</span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-5 text-center text-xs text-slate-400">
          Tap any helpline to call immediately from your phone.
        </div>
      </div>
    </div>
  );
}
