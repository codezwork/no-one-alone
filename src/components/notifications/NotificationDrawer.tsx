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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="relative flex h-full w-full max-w-sm flex-col glass-modal rounded-none border-l border-[var(--glass-border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--apple-blue)]" />
            <h2 className="text-sm font-bold text-[var(--ink)]">Community Alerts</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMarkAllRead}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-colors"
              title="Mark all as read"
            >
              <Check size={14} />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-bg-elevated)] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-12">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--apple-blue)] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--muted)] px-4">
              <Bell size={28} className="mx-auto text-[var(--muted)] mb-2 opacity-50" />
              <span>No alerts yet. You will be notified when someone within 3–4 km asks for help or claims your request.</span>
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
                className={`glass-card-interactive p-3.5 flex flex-col gap-1 ${
                  item.read === 0
                    ? 'border-[var(--apple-blue-border)] bg-[var(--apple-blue-soft)]'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-[var(--ink)] line-clamp-1">
                    {item.title}
                  </h4>
                  {item.read === 0 && (
                    <span className="h-2 w-2 rounded-full bg-[var(--apple-blue)] shrink-0 mt-1" />
                  )}
                </div>
                {item.body && (
                  <p className="text-[11.5px] text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                )}
                <span className="text-[9.5px] text-[var(--muted)] mt-1">
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
