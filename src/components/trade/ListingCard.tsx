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
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900 active:scale-[0.99] shadow-md flex flex-col"
    >
      {/* Photo or Placeholder Banner */}
      <div className="relative h-36 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {listing.photo ? (
          <img
            src={listing.photo}
            alt={listing.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-slate-500 transition-colors">
            <Package size={36} />
            <span className="text-[10px] mt-1 text-slate-500 font-medium">{listing.categoryLabel}</span>
          </div>
        )}

        {/* Price / Free Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isFree ? (
            <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-black text-slate-950 shadow-lg">
              FREE
            </span>
          ) : (
            <span className="rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
              ₹{listing.price}
            </span>
          )}
        </div>

        {/* Status indicator if reserved or sold */}
        {!isAvailable && (
          <div className="absolute bottom-2 left-2">
            {isReserved ? (
              <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                Reserved
              </span>
            ) : isSold ? (
              <span className="rounded-full bg-slate-700/90 px-2 py-0.5 text-[10px] font-bold text-white">
                Handed Over
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-rose-400 capitalize">{listing.categoryLabel}</span>
            {listing.distanceKm != null && (
              <span className="flex items-center gap-0.5 text-slate-400">
                <MapPin size={11} className="text-slate-500" />
                <span>{listing.distanceKm} km</span>
              </span>
            )}
          </div>

          <h3 className="mt-1 text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
            {listing.title}
          </h3>

          {listing.description && (
            <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500">
          <span>By {listing.seller?.firstName || 'Neighbour'}</span>
          <span className="capitalize">{listing.condition || 'good'} condition</span>
        </div>
      </div>
    </div>
  );
}
