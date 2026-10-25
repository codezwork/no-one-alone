# Neighbours by No One Alone

A mobile web app for finding and giving help nearby (4 km by default) during floods, cyclones and other calamities, and for trading essentials with people nearby. It installs on a phone's home screen like an app, follows the phone's GPS, and sends alerts even when it's closed.
This is the working app.

## What it does

- **Onboarding:** three steps: name (photo optional), then age, gender and marital status, then profession. Choosing "Something else" asks you to type what you do; it's tidied to match the listed ones ("civil  engineer" becomes "Civil engineer"), and a typed listed profession such as "electrician" is matched to it. Right after signup the phone asks to share its location. Others only ever see your first name and photo.
- **Radius:** everyone starts at 4 km. You can make it smaller or larger (1–10 km) in You, Location.
- **Needs:** post a request for a professional (doctor, nurse, electrician and so on) or for general help (a child, an elder, a meal, a delivery). The private address goes only to the one person who takes it.
- **Routing:** professional requests alert only people with that profession within their radius. General help reaches only people aged 24 and over. Nobody under 18 is sent to help.
- **Safety:** requests from girls aged 13–19 are never shown to men who are unmarried or under 25. Profiles are self-declared, so the app also keeps contact in-app, hides posts after 3 reports, and lists emergency numbers.
- **Need tracker:** posted, then taken (the poster and everyone who was alerted are told), then resolved (everyone is told again), then thanked. Requests expire after 24 hours.
- **Moving around:** when your location changes, you're alerted about open requests that are now in range.
- **Trade:** list essentials with an optional photo, at a price or free. Everyone within range sees them. A buyer taps "I want this", the seller reserves it for one person, they chat, and the seller marks it handed over. The app doesn't handle money.
- **Alerts:** an in-app inbox, live updates while the app is open, and web push when it's closed.

## Run it on your laptop

Needs Node.js 22.13 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000. To fill it with sample neighbours, requests and items around a point:

```bash
npm run seed -- 13.0012 80.2565
```

The seed prints a recovery code for each sample person; paste one into "I have a recovery code" to see the app as them.

Run the tests (rules plus end-to-end API checks of routing, the 24+ rule, the safety filter, the tracker and trade visibility):

```bash
npm test
```

## Use it on a phone

Phones only share GPS and accept push alerts over **HTTPS**, so the app needs to be deployed (or tunnelled) to work properly on a phone.

- **Quick test from your laptop:** run a tunnel such as `cloudflared tunnel --url http://localhost:3000` and open the https URL it prints on your phone.
- **Deploy on Render:** push this repo to GitHub, then in Render choose New, Blueprint, and select it. `render.yaml` sets up the service and a 1 GB disk for the database.
- **Anywhere else:** any Node 22 host with a persistent disk works (Railway with a volume, Fly.io with a volume, a small VPS). Set `DATA_DIR` to the disk's path.

On Android, Chrome offers "Install app". On iPhone, open the site in Safari, tap Share, then "Add to Home Screen". iOS shows push alerts only for apps added to the Home Screen (iOS 16.4+).

## Where data is stored

Everything lives in one SQLite file on the server: `data/neighbours.db` (or `$DATA_DIR/neighbours.db`), created on first start. It holds profiles, requests, the tracker history, items, chats, alerts and push subscriptions.

There are no Google or email accounts. Signing up creates an account and a random recovery code. The phone keeps the code in its browser storage to stay signed in. The server stores only a SHA-256 hash of the code, so the database alone can't be used to sign in as anyone. Evaluators can sign up with any name, or use the sample people from `npm run seed`.

## Settings

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` | Folder for the SQLite database |
| `DB_FILE` | `$DATA_DIR/neighbours.db` | Exact database path |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | generated on first run | Web push keys (stored in the database if not set) |
| `VAPID_SUBJECT` | `mailto:help@neighbours.invalid` | Contact address sent to push services |

## How it's built

- `server.js`: plain Node HTTP server with JSON API routes, a Server-Sent Events stream, static files, per-person rate limits and security headers (CSP).
- `src/rules.js`: who can see and take what, distance and radius. Pure functions, unit tested.
- `src/service.js`: accounts, location, needs and the tracker, trade, chat, reports and notifications.
- `src/db.js`: SQLite schema using Node's built-in `node:sqlite` (no native build step).
- `src/notify.js`: inbox, live stream and web push.
- `public/`: the phone app (no build step), service worker for offline use and push, install manifest and icons.

## Known limits

- Sign-in uses a recovery code instead of a phone OTP, because SMS needs a paid provider. Keep the code safe.
- Age, gender, marital status and profession are self-declared. Verifying professionals against their councils' registers is the next step before a real launch.
- The map picker uses OpenStreetMap tiles, which need a connection. GPS works offline, and the app shell loads offline once installed.
