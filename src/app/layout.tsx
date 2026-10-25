import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neighbours by No One Alone — Hyperlocal Calamity Aid',
  description: 'Find and give urgent help within 3–4 km during floods, cyclones and calamities, and trade essentials locally.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Neighbours',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-rose-500 selection:text-white">
        <main className="mx-auto flex min-h-screen max-w-md flex-col pb-20 sm:max-w-xl md:max-w-2xl lg:max-w-4xl">
          {children}
        </main>
      </body>
    </html>
  );
}
