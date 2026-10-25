'use client';
import React, { useEffect, useState } from 'react';
import { X, Bell, Check, Clock, Heart, Package, ShieldAlert } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onSelectNeed: (needId: string) => void;
  onSelectListing: (listingId: string) => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  token,
  onSelectNeed,
  onSelectListing,
  onUnreadCountChange,
}: NotificationDrawerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        onUnreadCountChange(d.unread || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, token]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        onUnreadCountChange(0);
      }
    } catch {
      /* ignore */
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-[#0f172a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-rose-400" />
            <h2 className="text-sm font-bold text-white">Neighbourhood Alerts</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkAllRead}
              className="rounded-lg p-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              title="Mark all as read"
            >
              <Check size={16} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-12">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Bell size={28} className="mx-auto text-slate-700 mb-2" />
              <span>No alerts yet. You will be notified when someone near you asks for help or offers supplies.</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.ref_type === 'need' && item.ref_id) {
                    onSelectNeed(item.ref_id);
                    onClose();
                  } else if (item.ref_type === 'listing' && item.ref_id) {
                    onSelectListing(item.ref_id);
                    onClose();
                  }
                }}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all hover:bg-slate-800/80 ${
                  item.read === 0
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-slate-800/70 bg-slate-900/40 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                  {item.read === 0 && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                  )}
                </div>
                {item.body && (
                  <p className="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                )}
                <span className="mt-2 block text-[10px] text-slate-500">
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
