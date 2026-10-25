'use client';
import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, HeartHandshake, Package, Layers } from 'lucide-react';
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
  const radiusMeters = (user?.radiusKm || 4) * 1000;

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

      // User location circle
      L.circle([centerLat, centerLng], {
        radius: radiusMeters,
        color: '#f43f5e',
        fillColor: '#f43f5e',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);

      // User dot marker
      const userDotIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="relative flex h-5 w-5 items-center justify-center">
                 <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                 <span class="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-rose-600 shadow-lg"></span>
               </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([centerLat, centerLng], { icon: userDotIcon })
        .addTo(map)
        .bindPopup(`<div class="p-1 font-sans text-xs"><strong>Your Location</strong><br/>${user?.radiusKm || 4} km active area</div>`);

      // Add Need Pins
      if (activeFilter === 'all' || activeFilter === 'needs') {
        needs.forEach((n) => {
          if (!n.lat || !n.lng) return;
          const needIcon = L.divIcon({
            className: 'need-marker',
            html: `<div class="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg border-2 border-white text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                     🆘
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const m = L.marker([n.lat, n.lng], { icon: needIcon }).addTo(map);
          m.on('click', () => setSelectedNeedId(n.id));
        });
      }

      // Add Trade Pins
      if (activeFilter === 'all' || activeFilter === 'trade') {
        listings.forEach((l) => {
          if (!l.lat || !l.lng) return;
          const tradeIcon = L.divIcon({
            className: 'trade-marker',
            html: `<div class="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg border-2 border-white text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                     📦
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
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
    <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl animate-fade-in mx-2 my-2 sm:mx-4">
      {/* Leaflet container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Top Filter Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex gap-1.5 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-lg pointer-events-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Pins
          </button>
          <button
            onClick={() => setActiveFilter('needs')}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === 'needs'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🆘 Needs ({needs.length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('trade')}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              activeFilter === 'trade'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📦 Supplies ({listings.length})</span>
          </button>
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/90 text-rose-400 backdrop-blur-md shadow-lg hover:bg-slate-800 transition-all pointer-events-auto active:scale-95"
          title="Recenter to my location"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none text-center">
        <span className="inline-block rounded-full bg-slate-900/90 border border-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 shadow-md backdrop-blur-md">
          Showing {user?.radiusKm || 4} km neighbourhood radius · Tap pins to open details
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
