# Neighbours by No One Alone

A modern mobile-first web application built with **Next.js 16**, **React 19**, and **Tailwind CSS** for finding and giving hyperlocal aid (within 3–4 km) during floods, cyclones, and calamities, as well as trading essential relief supplies locally.

It installs seamlessly on mobile devices as a Progressive Web App (PWA), tracks GPS coordinates with user consent, and delivers live notifications and updates.

---

## Features

- **Onboarding & Safety Profiles**: 3-step signup: Name (with optional profile picture), Age, Gender, Marital status, and Profession. If "Something else" is selected, the custom profession is sanitized and matched against standard categories.
- **Geofenced Radius**: Default active radius is 4 km, configurable from 1 to 10 km in user settings.
- **Needs & Calamity Requests**: Post emergency or general assistance needs. General help requests display public landmarks; exact private addresses are revealed only to the designated helper upon acceptance.
- **Intelligent & Safe Routing**:
  - **Professional Needs**: Directed exclusively to verified professions within the radius (e.g. Doctor, Nurse, Electrician, Plumber).
  - **General Help**: Restricted to volunteers aged 24 and older. Helpers must be 18+.
  - **Vulnerable Group Protection**: Needs from teenage girls (ages 13–19) are strictly filtered out for unmarried men and men under 25.
- **Need Tracker Lifecycle**: Full real-time audit trail: Posted → Taken → Resolved → Thanked. Automatic expiration after 24 hours.
- **Hyperlocal Trade & Barter**: List relief supplies (food, water, medicine, baby care, torches) at a set price or free. Local neighbours can request items, chat with sellers, and record handoffs.
- **Interactive Live Map**: Real-time Leaflet map displaying user geofence circle, active SOS requests, and available trade supplies.
- **SOS Quick Action**: Instant emergency modal with local helpline quick dials (112, 108, Women Helpline, Childline, Disaster Management).
- **Notifications & PWA**: In-app notifications drawer, push notifications via Web Push API, and offline service worker caching.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Mapping**: Leaflet + OpenStreetMap
- **Database**: Turso (libSQL / SQLite over HTTP)
- **Language**: TypeScript

---

## Getting Started

### Prerequisites

- Node.js 20+ (Node.js 22.13+ recommended)
- npm

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory (refer to `.env.example`):

```bash
# Turso Database Configuration
TURSO_DATABASE_URL="libsql://your-database-name.turso.io"
TURSO_AUTH_TOKEN="your-turso-auth-token"

# Web Push Keys (optional for push notifications)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:support@no-one-alone.org"
```

> **Note**: If `TURSO_DATABASE_URL` is omitted in local development, the app automatically falls back to a local SQLite database at `data/neighbours.db`.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Tests

```bash
npm test
```

Runs the safety, profession routing, distance calculation, and visibility rule tests.

### 5. Production Build

```bash
npm run build
npm start
```

---

## Deployment on Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. In **Project Settings → Environment Variables**, add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `VAPID_PUBLIC_KEY` (optional)
   - `VAPID_PRIVATE_KEY` (optional)
   - `VAPID_SUBJECT` (optional)
4. Deploy! Next.js App Router and all 28 API route handlers deploy as native edge/serverless endpoints.

---

## Project Structure

```
├── public/
│   ├── icons/                  # PWA application icons
│   ├── manifest.webmanifest    # PWA web manifest
│   └── sw.js                   # Service worker for offline & push notifications
├── src/
│   ├── app/
│   │   ├── api/                # Next.js App Router API endpoints
│   │   │   ├── listings/       # Trade listings & interactions
│   │   │   ├── me/             # Profile & location updates
│   │   │   ├── meta/           # Reference lists (professions, categories)
│   │   │   ├── needs/          # Needs posting, claiming, tracking
│   │   │   ├── notifications/  # User alerts & read state
│   │   │   ├── push/           # Push subscription endpoints
│   │   │   ├── signin/         # Recovery code authentication
│   │   │   └── signup/         # Account creation
│   │   ├── globals.css         # Tailwind & custom glassmorphism styles
│   │   ├── layout.tsx          # Root layout & PWA metadata
│   │   └── page.tsx            # Main application entry point
│   ├── components/
│   │   ├── auth/               # Sign in, Sign up, Recovery code card
│   │   ├── layout/             # Header, Bottom navigation
│   │   ├── map/                # Leaflet interactive map
│   │   ├── needs/              # Calamity needs cards, modals, tracker
│   │   ├── notifications/      # Notification drawer
│   │   ├── profile/            # User settings & location editor
│   │   ├── trade/              # Trade feed, listing modals
│   │   └── ui/                 # Emergency SOS modal
│   └── lib/
│       ├── auth.ts             # Auth bearer token extraction
│       ├── db.ts               # Turso database connection & SQL helper
│       ├── notify.ts           # Notification dispatcher & Web Push
│       ├── rules.ts            # Safety, age, and profession routing rules
│       └── service.ts          # Core service layer
├── test/
│   └── rules.test.mjs          # Business rules test suite
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── vercel.json                 # Security headers configuration
```
