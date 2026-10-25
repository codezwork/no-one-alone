'use client';
import React from 'react';
import { Phone, ShieldAlert, X } from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELPLINES = [
  { name: 'National Emergency Number', number: '112', desc: 'Police, Fire, Ambulance 24x7', badge: 'National' },
  { name: 'Disaster Management (NDRF)', number: '011-24363260', desc: 'Flood, Cyclone, Calamity rescue', badge: 'Rescue' },
  { name: 'Medical Emergency / Ambulance', number: '108', desc: 'Emergency medical transport & care', badge: 'Medical' },
  { name: 'Childline Emergency', number: '1098', desc: 'Assistance & shelter for children', badge: 'Care' },
  { name: 'Women Helpline', number: '1091', desc: '24x7 crisis distress helpline', badge: 'Safety' },
];

export function SosModal({ isOpen, onClose }: SosModalProps) {
  if (!isOpen) return null;

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30">
            <ShieldAlert size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)]">
              Emergency Services
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Direct official dial emergency lifelines in India
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {HELPLINES.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
              className="glass-card-interactive p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
                    {h.name}
                  </p>
                  <span className="frosted-badge frosted-badge-neutral text-[9.5px] py-0 px-2 shrink-0">
                    {h.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">
                  {h.desc}
                </p>
              </div>

              {/* Dialer Pill */}
              <div className="btn-pill btn-pill-primary py-1.5 px-3.5 text-xs font-black shrink-0 shadow-sm">
                <Phone size={13} />
                <span>{h.number}</span>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-5 text-center text-xs text-[var(--muted)] leading-relaxed">
          Tap any helpline to initiate an immediate direct phone call.
        </div>
      </div>
    </div>
  );
}
