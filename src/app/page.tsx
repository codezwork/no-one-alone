'use client';
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav, type TabType } from '@/components/layout/BottomNav';
import { NeedsFeed } from '@/components/needs/NeedsFeed';
import { TradeFeed } from '@/components/trade/TradeFeed';
import { MapView } from '@/components/map/MapView';
import { YouView } from '@/components/profile/YouView';
import { AuthModal } from '@/components/auth/AuthModal';
import { RecoveryCodeCard } from '@/components/auth/RecoveryCodeCard';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { NeedDetailModal } from '@/components/needs/NeedDetailModal';
import { ListingDetailModal } from '@/components/trade/ListingDetailModal';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('needs');
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [showAuth, setShowAuth] = useState(false);
  const [newCodeInfo, setNewCodeInfo] = useState<{ code: string; name: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNeedsCount, setOpenNeedsCount] = useState(0);

  // Direct modal deep-links
  const [directNeedId, setDirectNeedId] = useState<string | null>(null);
  const [directListingId, setDirectListingId] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    const savedToken = localStorage.getItem('neighbours_token');
    if (savedToken) {
      setToken(savedToken);
      fetch('/api/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.user) {
            setUser(d.user);
          } else {
            localStorage.removeItem('neighbours_token');
            setToken(null);
            setShowAuth(true);
          }
        })
        .catch(() => setShowAuth(true))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setShowAuth(true);
    }
  }, []);

  // Poll for notifications unread count every 8 seconds
  useEffect(() => {
    if (!token) return;
    const checkAlerts = () => {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (Number.isInteger(d.unread)) setUnreadCount(d.unread);
        })
        .catch(() => {});
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('neighbours_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setShowAuth(false);
    // If user just created an account (or we want to show recovery code)
    setNewCodeInfo({ code: newToken, name: newUser.name });
  };

  const handleSignOut = () => {
    localStorage.removeItem('neighbours_token');
    setToken(null);
    setUser(null);
    setShowAuth(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 shadow-xl shadow-rose-950/50">
          <span className="font-black text-white text-2xl">N</span>
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500"></span>
          </span>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wide">
          Connecting to Neighbours...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Header */}
      <Header
        user={user}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenLocationSettings={() => setActiveTab('you')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {newCodeInfo && (
          <div className="p-4">
            <RecoveryCodeCard
              code={newCodeInfo.code}
              userName={newCodeInfo.name}
              onDismiss={() => setNewCodeInfo(null)}
            />
          </div>
        )}

        {token && user ? (
          <>
            {activeTab === 'needs' && (
              <NeedsFeed
                token={token}
                user={user}
                onRefreshStats={(count) => setOpenNeedsCount(count)}
              />
            )}
            {activeTab === 'trade' && <TradeFeed token={token} user={user} />}
            {activeTab === 'map' && <MapView token={token} user={user} />}
            {activeTab === 'you' && (
              <YouView
                user={user}
                token={token}
                onUserUpdated={(u) => setUser(u)}
                onSignOut={handleSignOut}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        openNeedsCount={openNeedsCount}
      />

      {/* Auth Modal (if logged out) */}
      <AuthModal isOpen={showAuth} onSuccess={handleAuthSuccess} />

      {/* Notifications Drawer */}
      {token && (
        <NotificationDrawer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          token={token}
          onSelectNeed={(id) => setDirectNeedId(id)}
          onSelectListing={(id) => setDirectListingId(id)}
          onUnreadCountChange={(c) => setUnreadCount(c)}
        />
      )}

      {/* Direct links from notifications */}
      {directNeedId && token && (
        <NeedDetailModal
          needId={directNeedId}
          onClose={() => setDirectNeedId(null)}
          token={token}
          currentUser={user}
          onActionComplete={() => {}}
        />
      )}

      {directListingId && token && (
        <ListingDetailModal
          listingId={directListingId}
          onClose={() => setDirectListingId(null)}
          token={token}
          currentUser={user}
          onActionComplete={() => {}}
        />
      )}
    </div>
  );
}
