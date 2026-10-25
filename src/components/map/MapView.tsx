'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle, Package } from 'lucide-react';
import { NeedDetailModal } from '../needs/NeedDetailModal';
import { ListingDetailModal } from '../trade/ListingDetailModal';

interface MapViewProps {
  token: string;
  user: any;
}

export function MapView({ token, user }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [needs, setNeeds] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs' | 'trade'>('all');

  const centerLat = user?.lat || 13.0012;
  const centerLng = user?.lng || 80.2565;
  const radiusMeters = (user?.radiusKm || 3.5) * 1000;

  // Load items from APIs
  const loadMapData = async () => {
    if (!token) return;
    try {
      const [needsRes, listingsRes] = await Promise.all([
        fetch('/api/needs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/listings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (needsRes.ok) {
        const d = await needsRes.json();
        setNeeds(d.open || []);
      }
      if (listingsRes.ok) {
        const d = await listingsRes.json();
        setListings(d.nearby || []);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadMapData();
  }, [token]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;
    let L: any = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // User locality radius boundary circle
      L.circle([centerLat, centerLng], {
        radius: radiusMeters,
        color: '#000000',
        fillColor: '#000000',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '5, 5',
      }).addTo(map);

      // User location pulsing marker
      const userDotIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="relative flex h-5 w-5 items-center justify-center">
                 <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-neutral-400 opacity-75"></span>
                 <span class="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-black shadow-md"></span>
               </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([centerLat, centerLng], { icon: userDotIcon })
        .addTo(map)
        .bindPopup(`<div class="p-1 font-sans text-xs"><strong>Your Locality</strong><br/>${user?.radiusKm || 3.5} km active circle</div>`);

      // Add Need Pins (Clean vector alert marker instead of text emoji)
      if (activeFilter === 'all' || activeFilter === 'needs') {
        needs.forEach((n) => {
          if (!n.lat || !n.lng) return;
          const needIcon = L.divIcon({
            className: 'need-marker',
            html: `<div class="flex h-8 w-8 items-center justify-center rounded-2xl bg-black text-white shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                       <circle cx="12" cy="12" r="10"/>
                       <line x1="12" y1="8" x2="12" y2="12"/>
                       <line x1="12" y1="16" x2="12.01" y2="16"/>
                     </svg>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const m = L.marker([n.lat, n.lng], { icon: needIcon }).addTo(map);
          m.on('click', () => setSelectedNeedId(n.id));
        });
      }

      // Add Trade Pins (Clean vector package marker instead of text emoji)
      if (activeFilter === 'all' || activeFilter === 'trade') {
        listings.forEach((l) => {
          if (!l.lat || !l.lng) return;
          const tradeIcon = L.divIcon({
            className: 'trade-marker',
            html: `<div class="flex h-8 w-8 items-center justify-center rounded-2xl bg-neutral-800 text-white shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                       <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                       <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                     </svg>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const m = L.marker([l.lat, l.lng], { icon: tradeIcon }).addTo(map);
          m.on('click', () => setSelectedListingId(l.id));
        });
      }

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, radiusMeters, needs, listings, activeFilter]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([centerLat, centerLng], 14, { duration: 1 });
    }
  };

  return (
    <div className="relative h-[calc(100vh-160px)] w-full overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--bg-canvas)] shadow-2xl animate-fade-in">
      {/* Leaflet map container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Top Filter Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex gap-1.5 glass-dock p-1 pointer-events-auto shadow-lg">
          <button
            onClick={() => setActiveFilter('all')}
            className={`btn-pill text-xs py-1.5 px-3 min-h-[32px] ${
              activeFilter === 'all'
                ? 'btn-pill-primary font-bold'
                : 'btn-pill-secondary'
            }`}
          >
            All Pins
          </button>
          <button
            onClick={() => setActiveFilter('needs')}
            className={`btn-pill text-xs py-1.5 px-3 min-h-[32px] flex items-center gap-1.5 ${
              activeFilter === 'needs'
                ? 'btn-pill-primary font-bold'
                : 'btn-pill-secondary'
            }`}
          >
            <AlertCircle size={13} className="shrink-0" />
            <span>Needs ({needs.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('trade')}
            className={`btn-pill text-xs py-1.5 px-3 min-h-[32px] flex items-center gap-1.5 ${
              activeFilter === 'trade'
                ? 'btn-pill-primary font-bold'
                : 'btn-pill-secondary'
            }`}
          >
            <Package size={13} className="shrink-0" />
            <span>Supplies ({listings.length})</span>
          </button>
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="flex h-10 w-10 items-center justify-center rounded-full glass-island text-[var(--ink)] shadow-lg hover:bg-[var(--glass-bg-elevated)] transition-all pointer-events-auto active:scale-95"
          title="Recenter to my location"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* Bottom Hint Floating Badge */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none text-center">
        <span className="inline-flex items-center gap-1 rounded-full glass-island px-3.5 py-1 text-[11px] font-semibold text-[var(--ink)] shadow-md">
          <MapPin size={11} className="text-[var(--muted)]" />
          <span>Locality Zone: {user?.radiusKm || 3.5} km radius active</span>
        </span>
      </div>

      {/* Modals when tapping pins */}
      <NeedDetailModal
        needId={selectedNeedId}
        onClose={() => setSelectedNeedId(null)}
        token={token}
        currentUser={user}
        onActionComplete={loadMapData}
      />

      <ListingDetailModal
        listingId={selectedListingId}
        onClose={() => setSelectedListingId(null)}
        token={token}
        currentUser={user}
        onActionComplete={loadMapData}
      />
    </div>
  );
}
