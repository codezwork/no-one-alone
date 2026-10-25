'use client';
import React from 'react';
import { Package, MapPin, Tag, CheckCircle2, Clock } from 'lucide-react';

interface ListingCardProps {
  listing: any;
  onOpen: (listing: any) => void;
}

export function ListingCard({ listing, onOpen }: ListingCardProps) {
  const isFree = listing.free || listing.price == null;
  const isAvailable = listing.status === 'available';
  const isReserved = listing.status === 'reserved';
  const isSold = listing.status === 'sold';

  return (
    <div
      onClick={() => onOpen(listing)}
      className="glass-card-interactive flex flex-col group overflow-hidden"
    >
      {/* Photo or Placeholder Banner */}
      <div className="relative h-36 w-full bg-[var(--glass-bg-subtle)] flex items-center justify-center overflow-hidden border-b border-[var(--glass-border-contrast)]">
        {listing.photo ? (
          <img
            src={listing.photo}
            alt={listing.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[var(--muted)] group-hover:text-[var(--apple-blue)] transition-colors">
            <Package size={34} />
            <span className="text-[10px] mt-1 font-semibold">{listing.categoryLabel}</span>
          </div>
        )}

        {/* Price / Free Floating Frosted Pill Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isFree ? (
            <span className="frosted-badge frosted-badge-emerald font-black shadow-md">
              FREE
            </span>
          ) : (
            <span className="frosted-badge frosted-badge-neutral font-bold text-[var(--ink)] shadow-md">
              ₹{listing.price}
            </span>
          )}
        </div>

        {/* Status indicator if reserved or sold */}
        {!isAvailable && (
          <div className="absolute bottom-2 left-2">
            {isReserved ? (
              <span className="frosted-badge frosted-badge-neutral text-[10px] font-semibold text-[var(--ink)]">
                Reserved
              </span>
            ) : isSold ? (
              <span className="frosted-badge frosted-badge-neutral text-[10px]">
                Handed Over
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--apple-blue)] capitalize truncate">
              {listing.categoryLabel}
            </span>
            {listing.distanceKm != null && (
              <span className="flex items-center gap-0.5 text-[var(--muted)] shrink-0">
                <MapPin size={11} className="text-rose-500" />
                <span>{listing.distanceKm} km</span>
              </span>
            )}
          </div>

          <h3 className="mt-1 text-xs sm:text-sm font-bold text-[var(--ink)] group-hover:text-[var(--apple-blue)] transition-colors line-clamp-1">
            {listing.title}
          </h3>

          {listing.description && (
            <p className="mt-1 text-[11px] text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] pt-2 text-[10.5px] text-[var(--muted)]">
          <span>By {listing.seller?.firstName || 'Neighbour'}</span>
          <span className="capitalize">{listing.condition || 'good'} condition</span>
        </div>
      </div>
    </div>
  );
}
