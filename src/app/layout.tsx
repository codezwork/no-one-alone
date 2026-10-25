import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'No One Alone — Hyperlocal Calamity Aid',
  description: 'Find and give urgent mutual help within 3–4 km during floods, cyclones and calamities, and trade essentials locally.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'No One Alone',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('neighbours_theme') || localStorage.getItem('no_one_alone_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen text-[var(--ink)] antialiased selection:bg-neutral-800 selection:text-white">
        {/* Anti-Gravity Ambient Mesh Orbs */}
        <div className="ambient-mesh pointer-events-none" aria-hidden="true">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
        </div>

        {/* Floating App Canvas */}
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
          {children}
        </div>
      </body>
    </html>
  );
}
