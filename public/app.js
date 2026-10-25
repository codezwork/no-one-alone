/* Neighbours: the phone app. Plain JS, no build step.
   Talks to the JSON API, keeps a live event stream open for alerts, and follows the phone's
   GPS so "nearby" stays accurate as people move. */
(function () {
  'use strict';

  // ------------------------------------------------------------------ basics
  const $ = (s, el = document) => el.querySelector(s);
  const appEl = $('#app');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } }
  };
  const S = {
    token: store.get('nb_token'), me: null, meta: null, unread: 0,
    ob: null,                 // onboarding answers before the account exists
    draft: { need: null, item: null },
    view: {},                 // per-screen UI state (confirm prompts, tabs, selected chat)
    pickFor: 'me',            // what the map picker is choosing a spot for
    loc: { watchId: null, last: null, sentAt: 0, mode: 'off', accuracy: null }
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'Someone';
  const initials = (n) => String(n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const P = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    bag: '<path d="M6 7h12l1 14H5L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1 7.8 7.8 7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    nav: '<path d="m3 11 19-9-9 19-2-8-8-2z"/>',
    map: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    medic: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5z"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    device: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    child: '<circle cx="12" cy="5" r="2"/><path d="M9 22v-6H5l3.5-7.5c.3-.7 1-1.1 1.8-1.1h3.4c.8 0 1.5.4 1.8 1.1L19 16h-4v6"/>'
  };
  const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.info}</svg>`;
  const MARK = (cls = 'brandmark') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="mkGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0071e3"/><stop offset="100%" stop-color="#0055b3"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#mkGrad)"/><path d="M10 26V14a6 6 0 0 1 12 0v12z" fill="#ffffff" fill-opacity="0.95"/><circle cx="16" cy="17.3" r="2.2" fill="#0071e3"/><path d="M12.6 26c0-2.3 1.5-3.9 3.4-3.9s3.4 1.6 3.4 3.9z" fill="#0071e3"/></svg>`;

  function applyTheme(theme) {
    theme = theme || 'system';
    store.set('nb_theme', theme);
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
  function getTheme() {
    return store.get('nb_theme') || 'system';
  }

  function ago(ts) {
    if (!ts) return '';
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  function until(ts) {
    const m = Math.max(0, Math.round((ts - Date.now()) / 60000));
    return m < 60 ? `${m} min` : `${Math.round(m / 60)} h`;
  }
  const km = (d) => (d == null ? '' : d < 1 ? `${Math.round(d * 1000 / 50) * 50 || 50} m` : `${d.toFixed(1)} km`);
  const rupees = (p) => (p == null ? 'Free' : '₹' + Number(p).toLocaleString('en-IN'));
  const label = (list, id) => ((list || []).find((x) => x.id === id) || {}).label || '';
  function distKm(a, b) {
    const r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  let toastTimer;
  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, isError ? 4500 : 3200);
  }

  // ------------------------------------------------------------------ API
  async function api(method, path, body) {
    let res;
    try {
      res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new Error('You seem to be offline. Check your connection and try again.');
    }
    let data = {};
    const ct = res.headers.get('content-type') || '';
    try {
      data = await res.json();
    } catch {
      if (res.ok && !ct.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please try again.');
      }
    }
    if (res.status === 401 && S.token && !path.startsWith('/api/sign')) {
      signOut();
      throw new Error('Please sign in again.');
    }
    if (!res.ok) {
      const err = new Error((data.error && data.error.message) || 'Something went wrong. Please try again.');
      err.code = data.error && data.error.code;
      throw err;
    }
    return data;
  }

  // ------------------------------------------------------------------ routing
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    return { name: parts[0] || 'nearby', id: parts[1] || null };
  }
  function go(path) {
    if (location.hash === '#/' + path) render(); else location.hash = '#/' + path;
  }
  window.addEventListener('hashchange', () => { S.view = { tradeTab: S.view.tradeTab, feedFilter: S.view.feedFilter }; render(); });

  let renderSeq = 0;
  let lastRouteKey = '';
  async function render(opts = {}) {
    const seq = ++renderSeq;
    const r = route();
    const key = r.name + '/' + (r.id || '');
    const keepScroll = opts.keepScroll && key === lastRouteKey ? window.scrollY : null;
    lastRouteKey = key;

    if (!S.meta || !S.meta.rules) {
      try {
        const m = await api('GET', '/api/meta');
        if (!m || !m.rules) throw new Error('Could not load community rules. Please refresh.');
        S.meta = m;
      } catch (e) {
        return paintRaw(errorPage(e));
      }
    }
    if (!S.token) {
      if (r.name === 'signin') return paintRaw(viewSignin());
      if (r.name === 'onboard') return paintRaw(viewOnboard());
      return paintRaw(viewWelcome());
    }
    if (r.name === 'onboard' && obInit().step >= 4) return paintRaw(viewOnboard());
    if (!S.me) {
      try { S.me = (await api('GET', '/api/me')).user; startServices(); } catch (e) { if (S.token) return paintRaw(errorPage(e)); return render(); }
    }
    const screens = {
      nearby: screenNearby, need: screenNeed, post: screenPost, ask: screenAsk, offer: screenOffer, trade: screenTrade,
      listing: screenListing, alerts: screenAlerts, me: screenMe, edit: screenEdit, location: screenLocation, safety: screenSafety
    };
    const fn = screens[r.name] || screenNearby;
    const slow = setTimeout(() => { if (seq === renderSeq) paintScreen(r, { title: titleFor(r.name), body: '<div class="spin" role="status" aria-label="Loading"></div>' }); }, 150);
    try {
      const view = await fn(r);
      clearTimeout(slow);
      if (seq !== renderSeq) return;
      paintScreen(r, view);
      if (keepScroll != null) window.scrollTo(0, keepScroll); else if (!opts.keepScroll) window.scrollTo(0, 0);
      if (view.after) view.after();
    } catch (e) {
      clearTimeout(slow);
      if (seq !== renderSeq) return;
      paintScreen(r, { title: titleFor(r.name), back: true, body: `<div class="notice danger">${ic('alert')}<div>${esc(e.message)}</div></div>` });
    }
  }
  const titleFor = (n) => ({ nearby: 'Nearby', need: 'Request', post: 'Post', ask: 'Ask for help', offer: 'Offer an item', trade: 'Trade', listing: 'Item', alerts: 'Alerts', me: 'You', edit: 'Edit profile', location: 'Your location', safety: 'Safety and rules' }[n] || 'Neighbours');

  function paintRaw(html) { appEl.innerHTML = html; }

  // ------------------------------------------------------------------ Apple visionOS Floating Navigation
  function paintScreen(r, view) {
    const tabs = view.tabs !== false;
    const tab = { nearby: 'nearby', need: 'nearby', trade: 'trade', listing: 'trade', post: 'post', ask: 'post', offer: 'post', alerts: 'alerts', me: 'me', edit: 'me', location: 'me', safety: 'me' }[r.name] || 'nearby';
    
    // Top Floating Pill / Dynamic Island Content
    let headerContent = '';
    if (view.back) {
      headerContent = `
        <button class="pill-btn-back" data-act="back" aria-label="Back">
          ${ic('back', 'sm')}
          <span>Back</span>
        </button>
        <h1 class="pill-title">${esc(view.title || 'Neighbours')}</h1>
        <div class="pill-back-spacer" aria-hidden="true"></div>
      `;
    } else {
      headerContent = `
        <a href="#/nearby" class="pill-brand" aria-label="No One Alone">
          ${MARK('brandmark-pill')}
          <span class="brand-text">No One Alone</span>
        </a>
        ${S.me ? `
          <a href="#/me" class="pill-user" title="${esc(S.me.name)}">
            <span class="pill-avatar">${S.me.photo ? `<img src="${S.me.photo}" alt="">` : esc(initials(S.me.name))}</span>
            <span class="pill-user-name">${esc(firstName(S.me.name))}</span>
            <span class="pill-verified" title="Verified Locality">${ic('check', 'xs')}</span>
          </a>
        ` : ''}
      `;
    }

    appEl.innerHTML = `
      <header class="topbar">
        <div class="topbar-inner">
          ${headerContent}
        </div>
      </header>
      <main class="${tabs ? '' : 'no-tabs'}">${view.body}</main>
      ${tabs ? `
        <div class="tabbar">
          <nav aria-label="Main Navigation">
            ${tabLink('nearby', 'Feed', 'home', tab)}
            ${tabLink('trade', 'Trade', 'bag', tab)}
            <a class="tab post ${tab === 'post' ? 'on' : ''}" href="#/post" aria-label="Post Need or Offer">
              <span class="plus">${ic('plus', 'sm')}</span>
              <span>Post</span>
            </a>
            ${tabLink('alerts', 'Alerts', 'bell', tab, S.unread)}
            ${tabLink('me', 'You', 'user', tab)}
          </nav>
        </div>
      ` : ''}
    `;
  }

  function tabLink(name, text, icon, current, badge) {
    return `<a class="tab ${current === name ? 'on' : ''}" href="#/${name}" ${current === name ? 'aria-current="page"' : ''}>${ic(icon, 'sm')}<span>${text}</span>${badge ? `<span class="badge">${badge > 99 ? '99+' : badge}</span>` : ''}</a>`;
  }

  function locChip() {
    const m = S.loc.mode;
    const rad = (S.me && S.me.radiusKm) || (S.meta && S.meta.rules && S.meta.rules.defaultRadiusKm) || 3.5;
    const text = m === 'live' ? `${rad} km Locality Active` : m === 'manual' ? `${rad} km Map Zone` : m === 'waiting' ? 'Locating 3.5 km…' : 'Locality Off';
    const cls = m === 'live' ? 'live' : m === 'manual' ? 'manual' : m === 'waiting' ? 'waiting' : 'off';
    return `<a class="loc-chip ${cls}" href="#/location" data-act="pick-me" title="Locality radius: ${rad} km"><span class="pulse-ring"></span><span class="dot"></span><span class="loc-icon">${ic('pin', 'xs')}</span><span class="loc-text">${text}</span></a>`;
  }

  function refreshChip() {
    const chip = $('.loc-chip');
    if (chip) chip.outerHTML = locChip();
  }

  function errorPage(e) {
    return `<div class="boot"><div class="boot-mark"></div><p>${esc(e.message)}</p><button class="btn small" data-act="reload">Try again</button></div>`;
  }

  // ------------------------------------------------------------------ welcome, sign-in, onboarding
  function viewWelcome() {
    return `<div class="welcome-container">
      <div class="card welcome-card">
        <div class="welcome-header">
          <div class="locality-badge-pill">${ic('pin', 'sm')} Hyperlocal 3–4 km Calamity &amp; Aid Network</div>
          <div class="welcome-mark">${MARK('brandmark-lg')}</div>
          <h1 class="welcome-title">Help is closer than you think.</h1>
          <p class="welcome-lead">“No One Alone” instantly links verified neighbours within 3–4 km during calamity, power outages, and medical emergencies.</p>
        </div>

        <div class="welcome-tags">
          <span class="welcome-tag">${ic('medic', 'xs')} Medical</span>
          <span class="welcome-tag">${ic('zap', 'xs')} Electrician</span>
          <span class="welcome-tag">${ic('coffee', 'xs')} Warm Meals</span>
          <span class="welcome-tag">${ic('car', 'xs')} Transport</span>
          <span class="welcome-tag">${ic('child', 'xs')} Childcare</span>
          <span class="welcome-tag">${ic('heart', 'xs')} Elder Care</span>
        </div>

        <div class="welcome-features">
          <div class="welcome-feat">
            <div class="feat-ic">${ic('medic')}</div>
            <div class="feat-text"><strong>Professional Aid:</strong> Doctors, nurses, electricians alerted in real-time within your radius.</div>
          </div>
          <div class="welcome-feat">
            <div class="feat-ic">${ic('users')}</div>
            <div class="feat-text"><strong>Neighbourhood Care:</strong> Verified adults (24+) step up for emergency childcare and elder support.</div>
          </div>
          <div class="welcome-feat">
            <div class="feat-ic">${ic('bag')}</div>
            <div class="feat-text"><strong>Hyperlocal Trade:</strong> Free essentials and emergency supply sharing without middlemen.</div>
          </div>
        </div>

        <div class="welcome-actions">
          <a class="btn amber" href="#/onboard" data-act="start-onboard">Create your profile</a>
          <a class="btn line" href="#/signin">I have a recovery code</a>
          <p class="welcome-footer-hint">In danger right now? Call <strong>112</strong> (National Emergency) or <strong>108</strong>.</p>
        </div>
      </div>
    </div>`;
  }

  function viewSignin() {
    return `<div class="welcome-container">
      <div class="card welcome-card">
        <div class="welcome-header">
          <div class="locality-badge-pill">${ic('shield', 'sm')} Fast Locality Recovery</div>
          <div class="welcome-mark">${MARK('brandmark-lg')}</div>
          <h1 class="welcome-title">Welcome back</h1>
          <p class="welcome-lead">Enter the recovery code you saved when you created your profile.</p>
        </div>
        <form data-form="signin" class="stack" style="margin-top:20px">
          <div class="field">
            <label class="sr" for="code" style="font-weight:650">Recovery code</label>
            <input id="code" name="code" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" required placeholder="Paste your 32-character recovery code">
          </div>
          <button class="btn amber" type="submit">Sign in</button>
        </form>
        <div style="margin-top:16px">
          <a class="btn line" href="#/">Back to home</a>
        </div>
      </div>
    </div>`;
  }

  function obInit() {
    if (!S.ob) { try { S.ob = JSON.parse(store.get('nb_ob') || 'null'); } catch { S.ob = null; } }
    if (!S.ob) S.ob = { step: 1, name: '', photo: null, age: '', gender: '', marital: '', profession: '', professionOther: '' };
    return S.ob;
  }

  function viewOnboard() {
    const ob = obInit();
    store.set('nb_ob', JSON.stringify(ob)); // survive a reload mid-signup
    const meta = S.meta;
    const prog = (n) => `<div class="progress" aria-label="Step ${n} of 3">${[1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : ''}"></span>`).join('')}</div>`;
    const backBtn = ob.step > 1 && ob.step < 4 ? `<button class="pill-btn-back" data-act="ob-back" aria-label="Back">${ic('back', 'sm')} <span>Back</span></button>` : `<div class="pill-brand">${MARK('brandmark-sm')} <span class="brand-text">No One Alone</span></div>`;
    const header = (title) => `
      <header class="topbar">
        <div class="topbar-inner">
          ${backBtn}
          <h1 class="pill-title">${title}</h1>
          <div class="pill-back-spacer" aria-hidden="true"></div>
        </div>
      </header>`;
    let body;
    if (ob.step === 1) {
      body = `<div class="card onboard-card">${prog(1)}<h2 class="title">What should neighbours call you?</h2><p class="lead">Others only ever see your first name and photo.</p>
        <form data-form="ob1">
          <div class="field"><label for="ob-name">Your name</label><input id="ob-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="60" value="${esc(ob.name)}" placeholder="e.g. Maya"></div>
          <div class="field"><span class="label">Photo <span class="faint">(optional)</span></span>
            <div class="photo-pick"><div class="avatar lg">${ob.photo ? `<img src="${ob.photo}" alt="">` : ic('user', 'lg')}</div>
            <div class="stack" style="gap:6px"><label class="btn line small" for="ob-photo">${ic('camera', 'sm')} ${ob.photo ? 'Change photo' : 'Add a photo'}</label>
            <input id="ob-photo" type="file" accept="image/*" data-photo="ob" hidden>${ob.photo ? '<button type="button" class="link-btn" data-act="ob-photo-clear">Remove</button>' : ''}</div></div></div>
          <button class="btn amber" type="submit" style="margin-top:16px">Continue</button></form></div>`;
    } else if (ob.step === 2) {
      const seg = (name, opts, cur) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button type="button" data-act="ob-set" data-k="${name}" data-v="${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</div>`;
      body = `<div class="card onboard-card">${prog(2)}<h2 class="title">A little about you</h2>
        <div class="notice info" style="margin-bottom:18px">${ic('shield')}<div>We use these only to keep people safe, for example to decide who can see requests from teenagers. They are never shown to anyone.</div></div>
        <form data-form="ob2">
          <div class="field"><label for="ob-age">Age</label><input id="ob-age" name="age" type="number" inputmode="numeric" min="1" max="110" required value="${esc(ob.age)}" placeholder="Your age in years"></div>
          <div class="field"><span class="label">Gender</span>${seg('gender', [['female', 'Female'], ['male', 'Male'], ['other', 'Other']], ob.gender)}</div>
          <div class="field"><span class="label">Marital status</span>${seg('marital', [['married', 'Married'], ['unmarried', 'Unmarried']], ob.marital)}</div>
          <button class="btn amber" type="submit" style="margin-top:16px">Continue</button></form></div>`;
    } else if (ob.step === 3) {
      body = `<div class="card onboard-card">${prog(3)}<h2 class="title">What do you do?</h2><p class="lead">Requests for your skills reach you first within 3–4 km. Pick “Something else” if none fit.</p>
        <form data-form="ob3"><div class="option-list" role="radiogroup" aria-label="Profession">
          ${meta.professions.map((p) => `<label><input type="radio" name="profession" value="${p.id}" ${ob.profession === p.id ? 'checked' : ''} required>${esc(p.label)}</label>`).join('')}
        </div>
        <div class="field" id="ob-other-field" style="margin-top:16px" ${ob.profession === 'other' ? '' : 'hidden'}>
          <label for="ob-other">What do you do?</label>
          <input id="ob-other" name="professionOther" type="text" maxlength="40" autocomplete="organization-title" placeholder="e.g. Civil engineer" value="${esc(ob.professionOther)}">
          <span class="hint">It shows on your profile just like the professions above.</span></div>
        <p class="small muted" style="margin:16px 0">Next, your phone will verify your 3–4 km locality so we can show people within ${S.meta.rules.defaultRadiusKm} km. You can change that distance later in settings.</p>
        <button class="btn amber" type="submit">Create my profile</button></form></div>`;
    } else if (ob.step === 4) {
      body = `<div class="card onboard-card"><h2 class="title">Save your recovery code</h2><p class="lead">It is the only way to get back into your profile on a new phone. Keep it somewhere safe and don’t share it.</p>
        <div class="code" id="rc">${esc(S.token)}</div>
        <div class="btn-row" style="margin:16px 0 20px"><button class="btn line" data-act="copy-code">Copy code</button></div>
        <button class="btn amber" data-act="ob-next">I’ve saved it</button></div>`;
    } else {
      const ios = /iphone|ipad/i.test(navigator.userAgent) && !window.navigator.standalone;
      body = `<div class="card onboard-card"><h2 class="title">Turn on alerts</h2><p class="lead">We’ll tell you when someone nearby needs your help, when your request is taken, and when it’s resolved.</p>
        ${ios ? `<div class="notice warn" style="margin-bottom:16px">${ic('info')}<div>On iPhone, add Neighbours to your Home Screen first: tap Share, then “Add to Home Screen”, and open it from there.</div></div>` : ''}
        <div class="stack"><button class="btn amber" data-act="ob-push">${ic('bell')} Turn on alerts</button><button class="btn line" data-act="ob-done">Not now</button></div></div>`;
    }
    const titles = { 1: 'Create your profile', 2: 'Create your profile', 3: 'Skills & Locality', 4: 'Almost done', 5: 'Almost done' };
    return `${header(titles[ob.step])}<main class="no-tabs">${body}</main>`;
  }

  // ------------------------------------------------------------------ cards
  function needIcon(n) {
    if (['resolved'].includes(n.status)) return `<div class="ic done">${ic('check')}</div>`;
    if (n.kind === 'general') return `<div class="ic general">${ic('users')}</div>`;
    return `<div class="ic">${ic(['doctor', 'nurse', 'pharmacist', 'counsellor'].includes(n.profession) ? 'medic' : 'tool')}</div>`;
  }
  function statusPill(n) {
    const map = { open: ['open', 'Open'], taken: ['taken', n.helper ? `${n.role === 'helper' ? 'You’re helping' : 'Taken by ' + esc(n.helper.firstName)}` : 'Taken'], resolved: ['resolved', 'Resolved'], cancelled: ['closed', 'Cancelled'], expired: ['closed', 'Expired'], hidden: ['closed', 'Hidden'] };
    const [cls, text] = map[n.status] || ['closed', n.status];
    return `<span class="pill ${cls}">${text}</span>`;
  }

  function needCard(n) {
    const who = n.kind === 'professional' ? n.professionLabel : n.categoryLabel;
    const posterName = n.role === 'poster' ? 'You' : (n.poster ? esc(n.poster.firstName) : 'Neighbour');
    const helperName = n.helper ? esc(n.helper.firstName) : (n.role === 'helper' ? 'You' : 'A neighbour');
    const distText = n.distanceKm != null ? `${km(n.distanceKm)} away` : 'Within 3.5 km zone';

    // Locality Accountability State & Progress Pill
    let accountabilityState = '';
    let progressPill = '';

    if (n.status === 'taken') {
      accountabilityState = `
        <div class="accountability-banner">
          <div class="acc-icon-badge">${ic('check', 'sm')}</div>
          <div class="acc-content">
            <strong>${helperName}</strong> is assisting <strong>${posterName}</strong>
            <div class="faint tiny">Notified across 3.5 km zone</div>
          </div>
          <div class="acc-zone-tag">3.5 km Active</div>
        </div>
      `;
      progressPill = `
        <div class="progress-pill-track">
          <span class="progress-step done">${ic('check', 'xs')} Posted</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step current">Claimed by ${helperName}</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step">Satisfied</span>
        </div>
      `;
    } else if (n.status === 'resolved') {
      progressPill = `
        <div class="progress-pill-track">
          <span class="progress-step done">${ic('check', 'xs')} Posted</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step done">${ic('check', 'xs')} Claimed by ${helperName}</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step done">${ic('check', 'xs')} Satisfied</span>
        </div>
      `;
    } else if (n.status === 'open') {
      progressPill = `
        <div class="progress-pill-track">
          <span class="progress-step current"><span class="step-dot"></span> Posted</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step">Waiting for Helper</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step">Satisfied</span>
        </div>
      `;
    }

    return `<a class="card tap" href="#/need/${n.id}">
      <div class="need">
        ${needIcon(n)}
        <div class="grow">
          <div class="row wrap" style="gap:6px;margin-bottom:8px">
            <span class="pill distance">${ic('pin', 'xs')} ${distText}</span>
            <span class="pill category">${esc(who)}</span>
            ${n.alone ? `<span class="pill urgency">${ic('alert', 'xs')} Urgent Care</span>` : ''}
            ${statusPill(n)}
            ${n.restricted ? `<span class="pill restricted">${ic('lock', 'sm')}Restricted</span>` : ''}
            ${n.sample ? '<span class="pill sample">Sample</span>' : ''}
          </div>
          <h3>${esc(n.title)}</h3>
          ${n.details ? `<p class="need-summary">${esc(n.details)}</p>` : ''}
          <div class="meta">
            <span>Asked by <strong>${posterName}</strong></span>
            <span>·</span>
            <span>${ago(n.createdAt)}</span>
          </div>
          ${accountabilityState}
          ${progressPill}
          <div class="card-privacy-note">
            ${ic('lock', 'sm')}
            <span>Exact door address unlocks only upon accepting responsibility.</span>
          </div>
        </div>
      </div>
    </a>`;
  }

  function listingCard(l) {
    const st = l.status === 'reserved' ? `<span class="pill reserved">${l.role === 'buyer' ? 'Reserved for you' : 'Reserved'}</span>` : l.status === 'sold' ? '<span class="pill sold">Handed over</span>' : l.status === 'hidden' ? '<span class="pill closed">Hidden</span>' : '';
    const distText = l.distanceKm != null ? `${km(l.distanceKm)} away` : 'Within 3.5 km zone';
    return `<a class="card tap" href="#/listing/${l.id}"><div class="listing">
      <div class="thumb">${l.photo ? `<img src="${l.photo}" alt="" loading="lazy">` : ic(l.free ? 'gift' : 'bag', 'lg')}</div>
      <div class="grow"><div class="row" style="justify-content:space-between;align-items:flex-start"><h3 style="font-size:16.5px;margin:0;overflow-wrap:anywhere">${esc(l.title)}</h3><span class="price ${l.free ? 'free' : ''}">${rupees(l.price)}</span></div>
      <div class="row wrap" style="gap:6px;margin:8px 0 6px">
        <span class="pill distance">${ic('pin', 'xs')} ${distText}</span>
        <span class="pill category">${esc(l.categoryLabel)}</span>
        ${st}
        ${l.role === 'seller' && l.requestCount ? `<span class="pill taken">${l.requestCount} request${l.requestCount > 1 ? 's' : ''}</span>` : ''}
        ${l.myRequest && l.status === 'available' ? '<span class="pill open">You asked</span>' : ''}
        ${l.sample ? '<span class="pill sample">Sample</span>' : ''}
      </div>
      <div class="meta"><span>${ago(l.createdAt)}</span></div></div>
    </div></a>`;
  }

  function locationPrompt() {
    if (S.me && S.me.lat != null) return '';
    return `<div class="card stack" style="margin-bottom:14px"><div class="notice warn">${ic('pin')}<div>Turn on location to see requests and items near you within 3–4 km.</div></div>
      <div class="btn-row"><button class="btn small amber" data-act="gps-now">${ic('nav', 'sm')} Use my location</button><a class="btn small line" href="#/location" data-act="pick-me">${ic('map', 'sm')} Pick on map</a></div></div>`;
  }

  // ------------------------------------------------------------------ nearby feed
  async function screenNearby() {
    const d = await api('GET', '/api/needs');
    const me = S.me;
    const filter = S.view.feedFilter || 'all';
    const open = d.open.filter((n) => filter === 'all' || (filter === 'mine' ? n.kind === 'professional' : n.kind === 'general'));
    const activeMine = d.mine.filter((n) => ['open', 'taken'].includes(n.status));
    const activeHelping = d.helping.filter((n) => n.status === 'taken');
    const prof = S.meta.professions.find((p) => p.id === me.profession);
    const youHelp = [prof && prof.requestable ? `${prof.label.toLowerCase()} requests` : null, me.canOfferGeneralHelp ? 'general help' : null].filter(Boolean);
    const body = `${locationPrompt()}
      ${me.lat != null ? `<div class="row small muted" style="justify-content:space-between;margin-bottom:8px"><span>${ic('users', 'sm')} ${d.stats.helpersNearby} neighbours within ${me.radiusKm} km</span><span>${d.stats.metToday} ${d.stats.metToday === 1 ? 'need' : 'needs'} met today</span></div>` : ''}
      ${activeMine.length ? `<div class="section-label">Your requests</div><div class="stack">${activeMine.map(needCard).join('')}</div>` : ''}
      ${activeHelping.length ? `<div class="section-label">You’re helping with</div><div class="stack">${activeHelping.map(needCard).join('')}</div>` : ''}
      <div class="section-label">Needs near you (3–4 km)</div>
      <div class="seg" role="group" style="margin-bottom:14px">${[['all', 'All Needs'], ...(prof && prof.requestable ? [['mine', 'My profession']] : []), ...(me.canOfferGeneralHelp ? [['general', 'General help']] : [])].map(([v, t]) => `<button data-act="feed-filter" data-v="${v}" aria-pressed="${filter === v}">${t}</button>`).join('')}</div>
      ${open.length ? `<div class="stack">${open.map(needCard).join('')}</div>` : `<div class="empty"><strong>No open requests near you right now</strong>${youHelp.length ? `You’ll get an alert when someone within ${me.radiusKm} km needs ${youHelp.join(' or ')}.` : 'You can still ask for help, or offer items in Trade.'}</div>`}
      ${d.community.length ? `<div class="section-label">Transparent Community Resolution Log</div><div class="stack">${d.community.map(needCard).join('')}</div>` : ''}
      ${!me.canHelp ? `<div class="notice" style="margin-top:16px">${ic('info')}<div>You can ask for help and use Trade. Helping others opens at 18.</div></div>` : ''}`;
    return { title: 'Local Feed', body };
  }

  // ------------------------------------------------------------------ need detail
  const EVENT_TEXT = {
    posted: () => 'Posted', taken: (a) => `${a || 'Someone'} took responsibility`, released: (a) => `${a || 'The helper'} couldn’t make it; open again`,
    resolved: (a) => `Resolved${a ? ` by ${a}` : ''}`, thanked: () => 'Thank-you sent', cancelled: () => 'Cancelled', expired: () => 'Expired after 24 hours'
  };

  async function screenNeed(r) {
    const d = await api('GET', `/api/needs/${r.id}`);
    return { title: 'Request', back: true, body: needDetail(d) };
  }

  function needDetail(d) {
    const n = d.need;
    const v = S.view;
    const who = n.kind === 'professional' ? n.professionLabel : n.categoryLabel;
    const posterName = n.role === 'poster' ? 'You' : esc((n.poster && n.poster.firstName) || 'Neighbour');
    const helperName = n.helper ? esc(n.helper.firstName) : (n.role === 'helper' ? 'You' : 'Neighbour');
    const parts = [];

    // Locality Accountability State Banner in Detail View
    if (n.status === 'taken') {
      parts.push(`
        <div class="accountability-banner" style="margin-bottom:16px">
          <div class="acc-icon-badge">${ic('check', 'sm')}</div>
          <div class="acc-content">
            <div><strong>Responsibility Taken:</strong> ${helperName} is assisting ${posterName}</div>
            <div class="faint tiny">Broadcasted across 3.5 km locality zone</div>
          </div>
          <div class="acc-zone-tag">3.5 km Active</div>
        </div>
      `);
    }

    // Visual Progress Pill Track
    if (n.status === 'taken') {
      parts.push(`
        <div class="progress-pill-track" style="margin-bottom:16px">
          <span class="progress-step done">${ic('check', 'xs')} Posted</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step current">Claimed by ${helperName}</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step">Satisfied</span>
        </div>
      `);
    } else if (n.status === 'resolved') {
      parts.push(`
        <div class="progress-pill-track" style="margin-bottom:16px">
          <span class="progress-step done">${ic('check', 'xs')} Posted</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step done">${ic('check', 'xs')} Claimed by ${helperName}</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step done">${ic('check', 'xs')} Satisfied</span>
        </div>
      `);
    } else if (n.status === 'open') {
      parts.push(`
        <div class="progress-pill-track" style="margin-bottom:16px">
          <span class="progress-step current"><span class="step-dot"></span> Posted</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step">Waiting for Helper</span>
          <span class="progress-arrow">→</span>
          <span class="progress-step">Satisfied</span>
        </div>
      `);
    }

    parts.push(`<div class="row wrap" style="gap:6px">${statusPill(n)}${n.restricted ? `<span class="pill restricted">${ic('lock', 'sm')}Restricted</span>` : ''}${n.alone ? `<span class="pill urgency">${ic('alert', 'xs')} Urgent Care Needed</span>` : ''}${n.sample ? '<span class="pill sample">Sample</span>' : ''}</div>`);
    parts.push(`<h2 class="title" style="margin-top:10px">${esc(n.title)}</h2>`);
    if (n.details) parts.push(`<p style="white-space:pre-wrap;margin:0 0 16px;overflow-wrap:anywhere">${esc(n.details)}</p>`);
    parts.push(`<div class="card"><dl class="kv" style="margin:0">
      <dt>Needs</dt><dd>${esc(who)}</dd>
      <dt>Asked by</dt><dd>${posterName}</dd>
      ${n.role !== 'poster' ? `<dt>Distance</dt><dd>${km(n.distanceKm)} from you</dd>` : ''}
      ${n.landmark ? `<dt>Near</dt><dd>${esc(n.landmark)}</dd>` : ''}
      <dt>Posted</dt><dd>${ago(n.createdAt)}</dd>
      ${n.status === 'open' ? `<dt>Open for</dt><dd>${until(n.expiresAt)} more</dd>` : ''}
    </dl></div>`);

    // Actions by role
    if (n.role === 'viewer') {
      if (n.restricted && n.canTake) parts.push(`<div class="notice warn" style="margin-top:14px">${ic('shield')}<div>This request is from someone who may be vulnerable, so only a restricted group can see it. Keep all contact in this app and bring another adult if you can.</div></div>`);
      if (n.canTake) {
        parts.push(v.confirmTake
          ? `<div class="card stack" style="margin-top:14px"><b>Can you go now?</b><span class="small muted">You’ll get the address and a chat with ${posterName}. Everyone else who was alerted in the 3.5 km zone will see that you took responsibility.</span>
              <div class="btn-row"><button class="btn line" data-act="cancel-confirm">Not now</button><button class="btn teal" data-act="take" data-id="${n.id}">Yes, I’ll take responsibility</button></div></div>`
          : `<div style="margin-top:14px"><button class="btn teal" data-act="confirm-take">${ic('heart')} I Will Help / Claim Responsibility</button></div>`);
      } else if (n.status === 'open' && n.refusal) {
        parts.push(`<div class="notice" style="margin-top:14px">${ic('info')}<div>${esc(n.refusal)}</div></div>`);
      }
    }
    if (n.role === 'poster') {
      if (n.status === 'open') {
        parts.push(`<div class="notice info" style="margin-top:14px">${ic('bell')}<div>${n.alertedCount ? `We alerted ${n.alertedCount} ${n.alertedCount === 1 ? 'neighbour' : 'neighbours'} who can help.` : 'Nobody who can help is in range yet. We’ll alert people as they come within range.'} ${n.restricted ? 'For your safety, only women and married men aged 25 and over can see it.' : ''}</div></div>`);
      }
      if (n.helper && n.status === 'taken') parts.push(personCard(n.helper, 'is coming to help'));
      if (n.status === 'resolved' && n.helper) {
        parts.push(n.thanked
          ? `<div class="notice ok" style="margin-top:14px">${ic('heart')}<div>You thanked ${esc(n.helper.firstName)}.</div></div>`
          : `<div style="margin-top:14px"><button class="btn teal" data-act="thank" data-id="${n.id}">${ic('heart')} Thank ${esc(n.helper.firstName)}</button></div>`);
      }
    }
    if (n.role === 'helper') {
      parts.push(`<div class="section-label">Address</div>${n.address ? `<div class="address">${esc(n.address)}</div>` : `<div class="notice">${ic('info')}<div>${posterName} hasn’t added an address. Ask in the chat.</div></div>`}`);
      if (n.status === 'taken') parts.push(personCard(n.poster, 'asked for help'));
    }
    if (n.role === 'poster' && n.address && ['open', 'taken'].includes(n.status)) {
      parts.push(`<div class="section-label">Your address</div><div class="address">${esc(n.address)}</div><p class="tiny muted" style="margin:6px 0 0">Only your helper can see this.</p>`);
    }

    // Chat
    if (n.role !== 'viewer' && n.helper) {
      parts.push(`<div class="section-label">Chat</div><div class="chat">${d.messages.length ? d.messages.map((m) => `<div class="bubble ${m.mine ? 'mine' : ''}"><span class="who">${m.mine ? 'You' : esc(m.from)} · ${ago(m.at)}</span>${esc(m.body)}</div>`).join('') : `<p class="small muted" style="margin:0">No messages yet. Say hello and agree on the details.</p>`}</div>
        ${['taken', 'resolved'].includes(n.status) ? `<form class="chat-form" data-form="need-msg" data-id="${n.id}"><textarea name="body" id="need-msg" rows="1" maxlength="1000" placeholder="Write a message" required></textarea><button class="btn" type="submit" aria-label="Send">${ic('send')}</button></form>` : ''}`);
    }

    // Close-out actions
    if (n.role !== 'viewer' && ['open', 'taken'].includes(n.status)) {
      const btns = [];
      if (n.status === 'taken' || n.role === 'poster') btns.push(`<button class="btn teal" data-act="resolve" data-id="${n.id}">${ic('check')} Mark Satisfied / Resolved</button>`);
      if (n.role === 'helper') btns.push(v.confirmRelease
        ? `<div class="card stack"><b>Let someone else help?</b><span class="small muted">${posterName} will be told and the request opens again.</span><div class="btn-row"><button class="btn line" data-act="cancel-confirm">Keep helping</button><button class="btn danger" data-act="release" data-id="${n.id}">I can’t make it</button></div></div>`
        : `<button class="btn line" data-act="confirm-release">I can’t make it</button>`);
      if (n.role === 'poster') btns.push(v.confirmCancel
        ? `<div class="card stack"><b>Cancel this request?</b><span class="small muted">Everyone who was alerted will be told it’s no longer needed.</span><div class="btn-row"><button class="btn line" data-act="cancel-confirm">Keep it</button><button class="btn danger" data-act="cancel-need" data-id="${n.id}">Cancel request</button></div></div>`
        : `<button class="btn line" data-act="confirm-cancel">Cancel request</button>`);
      parts.push(`<div class="stack" style="margin-top:16px">${btns.join('')}</div>`);
    }

    // Tracker
    const evs = d.events.slice();
    parts.push(`<div class="section-label">Accountability Tracker</div><ul class="timeline">${evs.map((e, i) => `<li><span class="dot"></span><b>${esc((EVENT_TEXT[e.type] || (() => e.type))(e.actor))}</b><span>${ago(e.at)}</span></li>${i === 0 && n.role === 'poster' && n.alertedCount != null ? `<li><span class="dot"></span><b>${n.alertedCount} ${n.alertedCount === 1 ? 'neighbour' : 'neighbours'} alerted</b><span>Only people who match and are within range</span></li>` : ''}`).join('')}
      ${n.status === 'open' ? `<li><span class="dot wait"></span><b>Waiting for a helper</b><span>Open for ${until(n.expiresAt)} more</span></li>` : ''}
      ${n.status === 'taken' ? `<li><span class="dot wait"></span><b>Waiting to be satisfied</b><span>The asker or the helper can mark it resolved</span></li>` : ''}</ul>`);

    if (n.role === 'viewer') parts.push(reportBlock('need', n.id));
    return parts.join('');
  }

  function personCard(p, text) {
    return `<div class="card row" style="margin-top:14px"><div class="avatar">${p.photo ? `<img src="${p.photo}" alt="">` : esc(initials(p.firstName))}</div>
      <div class="grow"><b>${esc(p.firstName)}</b> <span class="muted">${esc(text)}</span>${p.professionLabel ? `<div class="small muted">${esc(p.professionLabel)}</div>` : ''}</div></div>`;
  }

  function reportBlock(type, id) {
    if (!S.view.reporting) return `<div style="text-align:center;margin-top:22px"><button class="link-btn" data-act="report-open">${ic('flag', 'sm')} Report this</button></div>`;
    const reasons = ['Looks like a scam', 'Unsafe or abusive', 'Price gouging', 'Spam or fake'];
    return `<div class="card stack" style="margin-top:20px"><b>Why are you reporting this?</b><span class="small muted">After several reports, a post is hidden automatically.</span>
      <div class="chips">${reasons.map((r) => `<button class="chip" data-act="report" data-type="${type}" data-id="${id}" data-reason="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <button class="link-btn" data-act="cancel-confirm">Cancel</button></div>`;
  }

  // ------------------------------------------------------------------ post
  async function screenPost() {
    return { title: 'Post', body: `<h2 class="title">What would you like to do?</h2>
      <div class="stack" style="margin-top:14px">
        <a class="card tap" href="#/ask"><div class="need"><div class="ic">${ic('heart')}</div><div class="grow"><h3>Post a Need / Ask for help</h3><div class="meta">Alert a professional or neighbours aged 24+ within ${S.me.radiusKm} km</div></div>${ic('right')}</div></a>
        <a class="card tap" href="#/offer"><div class="need"><div class="ic general">${ic('bag')}</div><div class="grow"><h3>Offer an item</h3><div class="meta">Sell or give away essentials you no longer need</div></div>${ic('right')}</div></a>
      </div>
      <div class="notice danger" style="margin-top:18px">${ic('alert')}<div><b>In danger right now?</b> Call 112 (emergency), 108 (ambulance) or 1098 (child helpline).</div></div>` };
  }

  function needDraft() {
    if (!S.draft.need) S.draft.need = { kind: 'professional', profession: '', category: '', title: '', details: '', landmark: '', address: '', alone: false, lat: null, lng: null };
    return S.draft.need;
  }

  async function screenAsk() {
    const dr = needDraft();
    const m = S.meta;
    const me = S.me;
    const sensitive = me.gender === 'female' && me.age <= 19;
    const choices = dr.kind === 'professional'
      ? m.professions.filter((p) => p.requestable).map((p) => `<button type="button" class="chip" data-act="draft-set" data-k="profession" data-v="${p.id}" aria-pressed="${dr.profession === p.id}">${esc(p.label)}</button>`).join('')
      : m.generalHelp.map((g) => `<button type="button" class="chip" data-act="draft-set" data-k="category" data-v="${g.id}" aria-pressed="${dr.category === g.id}">${esc(g.label)}</button>`).join('');
    const placeholder = dr.kind === 'professional' ? 'e.g. Fever and cough in a 2-year-old' : 'e.g. Sit with my mother for two hours';
    const usingPin = dr.lat != null;
    const body = `${locationPrompt()}
      <form data-form="ask" novalidate>
        <div class="field"><span class="label">Who do you need?</span>
          <div class="seg" role="group">${[['professional', 'A professional'], ['general', 'General help']].map(([v, t]) => `<button type="button" data-act="draft-set" data-k="kind" data-v="${v}" aria-pressed="${dr.kind === v}">${t}</button>`).join('')}</div>
          <span class="hint">${dr.kind === 'professional' ? 'Only people with that profession near you are alerted.' : `Any neighbour aged ${m.rules.generalHelpMinAge} or over near you can help.`}</span></div>
        <div class="field"><span class="label">${dr.kind === 'professional' ? 'Profession' : 'Kind of help'}</span><div class="chips">${choices}</div></div>
        <div class="field"><label for="ask-title">In a few words</label><input id="ask-title" type="text" maxlength="80" data-bind="need.title" value="${esc(dr.title)}" placeholder="${placeholder}"></div>
        <div class="field"><label for="ask-details">Details <span class="faint">(optional)</span></label><textarea id="ask-details" maxlength="600" data-bind="need.details" placeholder="Anything a helper should know">${esc(dr.details)}</textarea></div>
        <div class="field"><label for="ask-landmark">Landmark <span class="faint">(optional, everyone sees this)</span></label><input id="ask-landmark" type="text" maxlength="80" data-bind="need.landmark" value="${esc(dr.landmark)}" placeholder="e.g. Near the temple tank"></div>
        <div class="field"><label for="ask-address">Exact address <span class="faint">(only your helper sees this)</span></label><textarea id="ask-address" maxlength="200" data-bind="need.address" placeholder="House number, street, floor">${esc(dr.address)}</textarea></div>
        <label class="switch" for="ask-alone"><input id="ask-alone" type="checkbox" data-bind="need.alone" ${dr.alone ? 'checked' : ''}><span class="grow"><b>I’m alone right now</b><br><span class="small muted">Helps neighbours judge how urgent it is.</span></span></label>
        <div class="card row" style="margin-top:16px">${ic('pin')}<div class="grow small">${usingPin ? 'Using the spot you picked on the map' : me.lat != null ? 'Using your current location' : 'No location yet'}</div><a class="link-btn" href="#/location" data-act="pick-need">Change</a></div>
        <div id="audience" class="notice info" style="margin-top:14px">${ic('users')}<div>Choose who you need to see who will be alerted.</div></div>
        ${sensitive ? `<div class="notice warn" style="margin-top:10px">${ic('shield')}<div>For your safety, only women and married men aged 25 and over will see this request, and your exact address stays private until someone takes it.</div></div>` : ''}
        <button class="btn amber" type="submit" style="margin-top:16px">Post request</button>
      </form>`;
    return { title: 'Ask for help', back: true, body, after: updateAudience };
  }

  let audienceTimer;
  function updateAudience() {
    clearTimeout(audienceTimer);
    audienceTimer = setTimeout(async () => {
      const el = $('#audience');
      const dr = S.draft.need;
      if (!el || !dr) return;
      const pick = dr.kind === 'professional' ? dr.profession : dr.category;
      if (!pick) return;
      if (S.me.lat == null && dr.lat == null) { el.innerHTML = `${ic('pin')}<div>Set your location to see who will be alerted.</div>`; return; }
      try {
        const res = await api('POST', '/api/needs/preview', { kind: dr.kind, profession: dr.profession, category: dr.category, ...(dr.lat != null ? { lat: dr.lat, lng: dr.lng } : {}) });
        const whom = dr.kind === 'professional' ? (label(S.meta.professions, dr.profession) || 'professional').toLowerCase() + (res.count === 1 ? '' : 's') : (res.count === 1 ? 'neighbour aged 24+' : 'neighbours aged 24+');
        el.innerHTML = `${ic('users')}<div>${res.count ? `<b>${res.count} ${esc(whom)}</b> within range will be alerted right away.` : `No ${esc(whom)} are in range right now. We’ll alert people as soon as they come within range.`}</div>`;
      } catch { /* preview is best effort */ }
    }, 250);
  }

  function itemDraft() {
    if (!S.draft.item) S.draft.item = { title: '', category: '', condition: 'good', free: false, price: '', description: '', photo: null };
    return S.draft.item;
  }

  async function screenOffer() {
    const it = itemDraft();
    const body = `${locationPrompt()}<form data-form="offer" novalidate>
      <div class="field"><span class="label">Photo <span class="faint">(optional)</span></span>
        ${it.photo ? `<img class="hero-photo" src="${it.photo}" alt="">` : ''}
        <div class="row"><label class="btn line small" for="offer-photo">${ic('camera', 'sm')} ${it.photo ? 'Change photo' : 'Add a photo'}</label><input id="offer-photo" type="file" accept="image/*" data-photo="item" hidden>${it.photo ? '<button type="button" class="link-btn" data-act="item-photo-clear">Remove</button>' : ''}</div></div>
      <div class="field"><label for="offer-title">What are you offering?</label><input id="offer-title" type="text" maxlength="80" data-bind="item.title" value="${esc(it.title)}" placeholder="e.g. Steel cutlery set, 24 pieces"></div>
      <div class="field"><span class="label">Category</span><div class="chips">${S.meta.tradeCategories.map((c) => `<button type="button" class="chip" data-act="item-set" data-k="category" data-v="${c.id}" aria-pressed="${it.category === c.id}">${esc(c.label)}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Condition</span><div class="seg" role="group">${[['new', 'New'], ['good', 'Good'], ['used', 'Well used']].map(([v, t]) => `<button type="button" data-act="item-set" data-k="condition" data-v="${v}" aria-pressed="${it.condition === v}">${t}</button>`).join('')}</div></div>
      <label class="switch" for="offer-free"><input id="offer-free" type="checkbox" data-bind="item.free" ${it.free ? 'checked' : ''}><span class="grow"><b>Give it away for free</b></span></label>
      <div class="field" style="margin-top:16px" ${it.free ? 'hidden' : ''} id="price-field"><label for="offer-price">Price in rupees</label><input id="offer-price" type="number" inputmode="numeric" min="1" max="100000" data-bind="item.price" value="${esc(it.price)}" placeholder="e.g. 150"><span class="hint">Please keep prices fair. Neighbours can report price gouging.</span></div>
      <div class="field"><label for="offer-desc">Description <span class="faint">(optional)</span></label><textarea id="offer-desc" maxlength="500" data-bind="item.description" placeholder="Size, quantity, pickup times">${esc(it.description)}</textarea></div>
      <p class="small muted">Everyone within ${S.me.radiusKm} km can see this. Agree pickup and payment in the chat; Neighbours doesn’t handle money.</p>
      <button class="btn amber" type="submit">Post item</button></form>`;
    return { title: 'Offer an item', back: true, body };
  }

  // ------------------------------------------------------------------ trade
  async function screenTrade() {
    const d = await api('GET', '/api/listings');
    const tab = S.view.tradeTab || 'nearby';
    const lists = { nearby: d.nearby, mine: d.mine, requested: d.requested };
    const empty = {
      nearby: `<div class="empty"><strong>Nothing offered near you yet</strong>Items people offer within ${S.me.radiusKm} km will show up here.</div>`,
      mine: `<div class="empty"><strong>You haven’t offered anything</strong><a class="link-btn" href="#/offer">Offer an item</a></div>`,
      requested: `<div class="empty"><strong>You haven’t asked for anything</strong>Tap an item near you and choose “I want this”.</div>`
    };
    const list = lists[tab];
    const body = `${locationPrompt()}
      <div class="seg" role="group" style="margin-bottom:14px">${[['nearby', 'Near you'], ['mine', 'Your items'], ['requested', 'You asked']].map(([v, t]) => `<button data-act="trade-tab" data-v="${v}" aria-pressed="${tab === v}">${t}</button>`).join('')}</div>
      ${list.length ? `<div class="stack">${list.map(listingCard).join('')}</div>` : empty[tab]}
      <div style="margin-top:16px"><a class="btn line" href="#/offer">${ic('plus')} Offer an item</a></div>`;
    return { title: 'Trade', body };
  }

  async function screenListing(r) {
    const d = await api('GET', `/api/listings/${r.id}`);
    return { title: 'Item', back: true, body: listingDetail(d) };
  }

  function chatBlock(messages, formName, id, buyerId) {
    return `<div class="chat">${messages.length ? messages.map((m) => `<div class="bubble ${m.mine ? 'mine' : ''}"><span class="who">${m.mine ? 'You' : esc(m.from)} · ${ago(m.at)}</span>${esc(m.body)}</div>`).join('') : '<p class="small muted" style="margin:0">No messages yet.</p>'}</div>
      <form class="chat-form" data-form="${formName}" data-id="${id}" ${buyerId ? `data-buyer="${buyerId}"` : ''}><textarea name="body" rows="1" maxlength="1000" placeholder="Write a message" required></textarea><button class="btn" type="submit" aria-label="Send">${ic('send')}</button></form>`;
  }

  function listingDetail(d) {
    const l = d.listing;
    const v = S.view;
    const parts = [];
    if (l.photo) parts.push(`<img class="hero-photo" src="${l.photo}" alt="">`);
    parts.push(`<div class="row" style="justify-content:space-between;align-items:flex-start"><h2 class="title" style="margin:0">${esc(l.title)}</h2><span class="price ${l.free ? 'free' : ''}" style="font-size:22px">${rupees(l.price)}</span></div>`);
    parts.push(`<div class="row wrap" style="gap:6px;margin:10px 0 14px">${l.status === 'reserved' ? '<span class="pill reserved">Reserved</span>' : l.status === 'sold' ? '<span class="pill sold">Handed over</span>' : '<span class="pill open">Available</span>'}${l.sample ? '<span class="pill sample">Sample</span>' : ''}</div>`);
    if (l.description) parts.push(`<p style="white-space:pre-wrap;margin:0 0 14px;overflow-wrap:anywhere">${esc(l.description)}</p>`);
    parts.push(`<div class="card"><dl class="kv" style="margin:0">
      <dt>Category</dt><dd>${esc(l.categoryLabel)}</dd><dt>Condition</dt><dd>${esc({ new: 'New', good: 'Good', used: 'Well used' }[l.condition] || 'Good')}</dd>
      <dt>Offered by</dt><dd>${l.role === 'seller' ? 'You' : esc(l.seller.firstName)}</dd>
      ${l.role !== 'seller' ? `<dt>Distance</dt><dd>${km(l.distanceKm)} from you</dd>` : ''}<dt>Posted</dt><dd>${ago(l.createdAt)}</dd></dl></div>`);

    if (l.role === 'seller') {
      if (l.status === 'available') {
        parts.push(`<div class="section-label">Requests</div>`);
        if (!d.requests.length) parts.push(`<div class="empty"><strong>No requests yet</strong>You’ll get an alert when someone nearby wants it.</div>`);
        parts.push(d.requests.map((rq) => {
          const thread = d.threads.find((t) => t.buyer.id === rq.buyer.id);
          const open = v.chatWith === rq.buyer.id;
          return `<div class="card stack" style="margin-bottom:10px"><div class="row"><div class="avatar sm">${esc(initials(rq.buyer.firstName))}</div><div class="grow"><b>${esc(rq.buyer.firstName)}</b><div class="small muted">${ago(rq.at)}${rq.note ? ` · “${esc(rq.note)}”` : ''}</div></div></div>
            <div class="btn-row"><button class="btn small line" data-act="chat-with" data-v="${rq.buyer.id}">${ic('msg', 'sm')} ${open ? 'Hide chat' : 'Message'}</button><button class="btn small teal" data-act="accept" data-id="${l.id}" data-buyer="${rq.buyer.id}">Reserve for ${esc(rq.buyer.firstName)}</button></div>
            ${open ? chatBlock(thread ? thread.messages : [], 'listing-msg', l.id, rq.buyer.id) : ''}</div>`;
        }).join(''));
      } else if (l.status === 'reserved') {
        const thread = d.threads.find((t) => l.buyer && t.buyer.id === l.buyer.id);
        parts.push(`<div class="notice info" style="margin-top:14px">${ic('users')}<div>Reserved for <b>${esc(l.buyer ? l.buyer.firstName : 'someone')}</b>. Agree pickup in the chat, then mark it handed over.</div></div>
          <div class="section-label">Chat with ${esc(l.buyer ? l.buyer.firstName : 'buyer')}</div>${chatBlock(thread ? thread.messages : [], 'listing-msg', l.id, l.buyer && l.buyer.id)}
          <div class="stack" style="margin-top:14px"><button class="btn teal" data-act="sold" data-id="${l.id}">${ic('check')} Mark handed over</button><button class="btn line" data-act="release-listing" data-id="${l.id}">Make it available again</button></div>`);
      } else if (l.status === 'sold') {
        parts.push(`<div class="notice ok" style="margin-top:14px">${ic('check')}<div>Handed over to ${esc(l.buyer ? l.buyer.firstName : 'a neighbour')}.</div></div>`);
      }
      if (l.status !== 'sold') {
        parts.push(v.confirmWithdraw
          ? `<div class="card stack" style="margin-top:16px"><b>Take this item down?</b><span class="small muted">Anyone who asked for it will be told.</span><div class="btn-row"><button class="btn line" data-act="cancel-confirm">Keep it</button><button class="btn danger" data-act="withdraw" data-id="${l.id}">Take it down</button></div></div>`
          : `<div style="margin-top:16px"><button class="btn line" data-act="confirm-withdraw">${ic('trash')} Take it down</button></div>`);
      }
    } else {
      const thread = d.threads[0];
      if (l.status === 'available' && !l.myRequest) {
        parts.push(`<form data-form="request" data-id="${l.id}" style="margin-top:16px"><div class="field"><label for="req-note">Message to ${esc(l.seller.firstName)} <span class="faint">(optional)</span></label><input id="req-note" name="note" type="text" maxlength="200" placeholder="e.g. Can pick up this evening"></div>
          <button class="btn amber" type="submit">${ic('bag')} I want this</button></form>`);
      } else if (l.status === 'available' && l.myRequest) {
        parts.push(`<div class="notice info" style="margin-top:14px">${ic('clock')}<div>You asked for this. ${esc(l.seller.firstName)} will reply here.</div></div><div class="section-label">Chat with ${esc(l.seller.firstName)}</div>${chatBlock(thread ? thread.messages : [], 'listing-msg', l.id)}
          <div style="margin-top:14px"><button class="btn line" data-act="withdraw-request" data-id="${l.id}">I don’t need it any more</button></div>`);
      } else if (l.role === 'buyer' && l.status === 'reserved') {
        parts.push(`<div class="notice ok" style="margin-top:14px">${ic('check')}<div>Reserved for you. Agree a pickup time and place with ${esc(l.seller.firstName)}.</div></div><div class="section-label">Chat with ${esc(l.seller.firstName)}</div>${chatBlock(thread ? thread.messages : [], 'listing-msg', l.id)}
          <div style="margin-top:14px"><button class="btn line" data-act="withdraw-request" data-id="${l.id}">I don’t need it any more</button></div>`);
      } else if (l.role === 'buyer' && l.status === 'sold') {
        parts.push(`<div class="notice ok" style="margin-top:14px">${ic('heart')}<div>You have it. ${esc(l.seller.firstName)} marked it handed over.</div></div>`);
      } else if (l.status === 'reserved') {
        parts.push(`<div class="notice" style="margin-top:14px">${ic('clock')}<div>Reserved for someone else. ${l.myRequest ? 'You’ll hear if it becomes available again.' : ''}</div></div>`);
      }
      parts.push(reportBlock('listing', l.id));
    }
    return parts.join('');
  }

  // ------------------------------------------------------------------ alerts
  async function screenAlerts() {
    const d = await api('GET', '/api/notifications');
    S.unread = d.unread;
    const push = await pushState();
    const iconFor = (t) => (t.startsWith('need_new') ? 'bell' : t.startsWith('listing') ? 'bag' : t === 'message' ? 'msg' : t === 'thanks' ? 'heart' : t.includes('resolved') || t.includes('sold') ? 'check' : 'info');
    const href = (n) => (n.ref_type === 'need' ? `#/need/${n.ref_id}` : n.ref_type === 'listing' ? `#/listing/${n.ref_id}` : '#/alerts');
    const body = `${push === 'off' ? `<div class="card stack" style="margin-bottom:14px"><b>Get alerts even when the app is closed</b><span class="small muted">We’ll only alert you about things near you that you can help with, and updates on your own posts.</span><button class="btn amber small" data-act="push-on">${ic('bell', 'sm')} Turn on alerts</button></div>` : ''}
      ${push === 'denied' ? `<div class="notice warn" style="margin-bottom:14px">${ic('info')}<div>Alerts are blocked for this site. Turn them on in your browser’s site settings.</div></div>` : ''}
      ${d.items.length ? `<div class="card" style="padding:4px 14px">${d.items.map((n) => `<a class="alert-item ${n.read ? '' : 'unread'}" href="${href(n)}"><div class="ic">${ic(iconFor(n.type), 'sm')}</div><div class="grow"><b>${esc(n.title)}</b>${n.body ? `<div class="small muted" style="overflow-wrap:anywhere">${esc(n.body)}</div>` : ''}<div class="tiny faint">${ago(n.created_at)}</div></div></a>`).join('')}</div>`
        : `<div class="empty"><strong>No alerts yet</strong>When someone nearby needs help you can give, or your posts change, it shows up here.</div>`}`;
    return { title: 'Alerts', body, after: () => { if (d.unread) api('POST', '/api/notifications/read', {}).then(() => { S.unread = 0; updateBadge(); }).catch(() => {}); } };
  }

  // ------------------------------------------------------------------ you
  async function screenMe() {
    const me = S.me;
    const push = await pushState();
    const v = S.view;
    const curTheme = getTheme();
    const locLine = me.lat == null ? 'Not set' : S.loc.mode === 'live' ? `Following your phone${S.loc.accuracy ? ` (within ${Math.round(S.loc.accuracy)} m)` : ''}` : `Set ${me.locationManual ? 'on the map' : 'from your phone'} ${ago(me.locationAt)}`;
    const body = `<div class="card"><div class="profile-head"><div class="avatar lg">${me.photo ? `<img src="${me.photo}" alt="">` : esc(initials(me.name))}</div>
        <div class="grow"><h2 class="title" style="margin:0">${esc(me.name)}</h2><div class="muted small">${esc(me.professionLabel)} · ${me.age} · ${esc(me.gender)} · ${esc(me.marital)}</div></div></div>
        <div class="stats"><div class="stat"><b>${me.helped}</b><span>neighbours helped</span></div><div class="stat"><b>${me.thanks}</b><span>thank-yous received</span></div></div></div>
      <div class="section-label">Appearance</div>
      <div class="card row" style="justify-content:space-between;align-items:center">
        <div class="grow">
          <div class="small" style="font-weight:650">Color Scheme</div>
          <div class="tiny muted">Light, Dark, or System Default</div>
        </div>
        <div class="seg theme-seg" role="group" aria-label="Appearance Mode">
          <button type="button" data-act="theme-set" data-v="light" aria-pressed="${curTheme === 'light'}">${ic('sun', 'xs')} Light</button>
          <button type="button" data-act="theme-set" data-v="dark" aria-pressed="${curTheme === 'dark'}">${ic('moon', 'xs')} Dark</button>
          <button type="button" data-act="theme-set" data-v="system" aria-pressed="${curTheme === 'system'}">${ic('device', 'xs')} Auto</button>
        </div>
      </div>
      <div class="section-label">Locality Distance (3–4 km)</div>
      <div class="card stack"><div class="row">${ic('pin')}<div class="grow small">${esc(locLine)}</div></div>
        <div class="btn-row"><button class="btn small line" data-act="gps-now">${ic('nav', 'sm')} Use my phone</button><a class="btn small line" href="#/location" data-act="pick-me">${ic('map', 'sm')} Pick on map</a></div>
        <div class="row" style="justify-content:space-between;flex-wrap:wrap">
          <div class="grow"><div class="small" style="font-weight:650">Nearby locality reach</div><div class="tiny muted">${me.radiusKm === S.meta.rules.defaultRadiusKm ? 'The default 4 km radius.' : `Default is ${S.meta.rules.defaultRadiusKm} km. <button class="link-btn tiny" data-act="radius-set" data-v="${S.meta.rules.defaultRadiusKm}">Reset</button>`}</div></div>
          <div class="stepper"><button class="icon-btn" data-act="radius-set" data-v="${me.radiusKm - 1}" aria-label="Make nearby smaller" ${me.radiusKm <= S.meta.rules.minRadiusKm ? 'disabled' : ''}>−</button><b aria-live="polite">${me.radiusKm} km</b><button class="icon-btn" data-act="radius-set" data-v="${me.radiusKm + 1}" aria-label="Make nearby larger" ${me.radiusKm >= S.meta.rules.maxRadiusKm ? 'disabled' : ''}>+</button></div>
        </div></div>
      <div class="section-label">Alerts</div>
      <div class="card row"><div class="grow small">${push === 'on' ? 'Alerts are on for this phone.' : push === 'denied' ? 'Alerts are blocked in your browser settings.' : push === 'unsupported' ? 'This browser can’t show alerts when the app is closed. You’ll still see them here while the app is open.' : 'Alerts are off.'}</div>
        ${push === 'on' ? '<button class="btn small line" data-act="push-off">Turn off</button>' : push === 'off' ? '<button class="btn small amber" data-act="push-on">Turn on</button>' : ''}</div>
      <div class="section-label">Account</div>
      <div class="card" style="padding:0">
        <a class="list-btn" href="#/edit">${ic('edit')}<span class="grow">Edit profile</span>${ic('right', 'sm')}</a>
        <a class="list-btn" href="#/safety">${ic('shield')}<span class="grow">Safety and rules</span>${ic('right', 'sm')}</a>
        <button class="list-btn" data-act="toggle-code">${ic('key')}<span class="grow">${v.showCode ? 'Hide recovery code' : 'Show recovery code'}</span></button>
        ${v.showCode ? `<div style="padding:0 14px 14px"><div class="code">${esc(S.token)}</div><button class="btn small line" style="margin-top:8px" data-act="copy-code">Copy</button></div>` : ''}
        <button class="list-btn" data-act="sign-out">${ic('out')}<span class="grow">Sign out of this phone</span></button>
        <button class="list-btn" data-act="confirm-delete" style="color:var(--danger)">${ic('trash')}<span class="grow">Delete my profile</span></button>
      </div>
      ${v.confirmDelete ? `<div class="card stack" style="margin-top:12px"><b>Delete your profile for good?</b><span class="small muted">Your open requests are cancelled and your items taken down. This can’t be undone.</span><div class="btn-row"><button class="btn line" data-act="cancel-confirm">Keep it</button><button class="btn danger" data-act="delete-account">Delete</button></div></div>` : ''}
      <p class="tiny faint" style="text-align:center;margin-top:20px">No One Alone · Hyperlocal Emergency Mutual Aid</p>`;
    return { title: 'You', body };
  }

  async function screenEdit() {
    const me = S.me;
    const e = S.view.edit || (S.view.edit = { photo: me.photo, gender: me.gender, marital: me.marital });
    const seg = (name, opts, cur) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button type="button" data-act="edit-set" data-k="${name}" data-v="${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</div>`;
    const body = `<form data-form="edit">
      <div class="field"><span class="label">Photo <span class="faint">(optional)</span></span><div class="photo-pick"><div class="avatar lg">${e.photo ? `<img src="${e.photo}" alt="">` : esc(initials(me.name))}</div>
        <div class="stack" style="gap:6px"><label class="btn line small" for="edit-photo">${ic('camera', 'sm')} ${e.photo ? 'Change photo' : 'Add a photo'}</label><input id="edit-photo" type="file" accept="image/*" data-photo="edit" hidden>${e.photo ? '<button type="button" class="link-btn" data-act="edit-photo-clear">Remove</button>' : ''}</div></div></div>
      <div class="field"><label for="edit-name">Name</label><input id="edit-name" name="name" type="text" required minlength="2" maxlength="60" value="${esc(me.name)}"></div>
      <div class="field"><label for="edit-age">Age</label><input id="edit-age" name="age" type="number" inputmode="numeric" min="13" max="110" required value="${me.age}"></div>
      <div class="field"><span class="label">Gender</span>${seg('gender', [['female', 'Female'], ['male', 'Male'], ['other', 'Other']], e.gender)}</div>
      <div class="field"><span class="label">Marital status</span>${seg('marital', [['married', 'Married'], ['unmarried', 'Unmarried']], e.marital)}</div>
      <div class="field"><label for="edit-prof">Profession</label><select id="edit-prof" name="profession">${S.meta.professions.map((p) => `<option value="${p.id}" ${me.profession === p.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>
      <div class="field" id="edit-other-field" ${me.profession === 'other' ? '' : 'hidden'}><label for="edit-other">What do you do?</label><input id="edit-other" name="professionOther" type="text" maxlength="40" placeholder="e.g. Civil engineer" value="${esc(me.professionOther || '')}"></div>
      <button class="btn amber" type="submit">Save changes</button></form>`;
    return { title: 'Edit profile', back: true, body };
  }

  async function screenSafety() {
    const r = S.meta.rules;
    const item = (icon, title, text) => `<div class="card row" style="align-items:flex-start">${ic(icon)}<div class="grow"><b>${title}</b><div class="small muted">${text}</div></div></div>`;
    return { title: 'Safety and rules', back: true, body: `<div class="stack">
      ${item('medic', 'Professional requests', `Only people whose profile lists that profession, within their chosen distance (${r.defaultRadiusKm} km unless they change it), are alerted.`)}
      ${item('users', `General help is for ${r.generalHelpMinAge}+`, `Looking after children or elders, sharing meals and similar help can only be offered by people aged ${r.generalHelpMinAge} or over. Nobody under ${r.helperMinAge} is sent to help anyone.`)}
      ${item('shield', 'Extra protection for teenage girls', `Requests posted by girls aged 13–19 are never shown to men who are unmarried or under ${r.sensitiveMinViewerAge}. Only women and married men aged ${r.sensitiveMinViewerAge} and over see them.`)}
      ${item('lock', 'Your exact address stays private', 'Everyone sees only the distance and any landmark you add. Your address goes only to the one person who takes your request.')}
      ${item('flag', 'Report anything wrong', 'If several neighbours report a request or item, it is hidden automatically.')}
      ${item('info', 'Profiles are self-declared', 'Age, gender and profession are what people tell us. Keep contact in the app, meet in safe places where you can, and trust your instincts.')}
      <div class="notice danger">${ic('alert')}<div><b>Emergency numbers:</b> 112 (all emergencies), 108 (ambulance), 100 (police), 1098 (child helpline), 101 (fire).</div></div></div>` };
  }

  // ------------------------------------------------------------------ map picker
  async function screenLocation() {
    const forWhat = S.pickFor;
    const body = `<div id="map" class="map" role="application" aria-label="Map. Tap to choose your location."></div>
      <p class="map-hint">Tap the map to place the pin. The circle shows how far “nearby” (3–4 km) reaches.</p>
      <div class="stack"><button class="btn amber" data-act="save-pin" disabled id="save-pin">Use this spot</button>
      ${forWhat === 'me' ? `<button class="btn line" data-act="gps-now">${ic('nav')} Use my phone’s location instead</button>` : ''}</div>`;
    return { title: forWhat === 'need' ? 'Where is help needed?' : 'Your location', back: true, body, after: mountMap };
  }

  let mapState = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = '/vendor/leaflet/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = '/vendor/leaflet/leaflet.js';
      s.onload = () => resolve(window.L);
      s.onerror = () => reject(new Error('The map could not load. Check your connection.'));
      document.head.appendChild(s);
    });
  }
  async function mountMap() {
    const el = $('#map');
    if (!el) return;
    let L;
    try { L = await loadLeaflet(); } catch (e) { el.innerHTML = `<div class="notice danger" style="margin:12px">${ic('alert')}<div>${esc(e.message)}</div></div>`; return; }
    const src = S.pickFor === 'need' && S.draft.need && S.draft.need.lat != null ? S.draft.need
      : S.me && S.me.lat != null ? S.me : null;
    const radius = (S.me && S.me.radiusKm) || S.meta.rules.defaultRadiusKm;
    const map = L.map(el, { zoomControl: true }).setView(src ? [src.lat, src.lng] : [20.59, 78.96], src ? 14 : 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin', attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapState = { map, marker: null, circle: null, point: src ? { lat: src.lat, lng: src.lng } : null };
    const place = (p) => {
      mapState.point = p;
      if (!mapState.marker) { mapState.marker = L.marker([p.lat, p.lng]).addTo(map); mapState.circle = L.circle([p.lat, p.lng], { radius: radius * 1000, color: '#0071e3', weight: 2, fillOpacity: 0.08 }).addTo(map); }
      else { mapState.marker.setLatLng([p.lat, p.lng]); mapState.circle.setLatLng([p.lat, p.lng]); }
      const btn = $('#save-pin'); if (btn) btn.disabled = false;
    };
    if (src) place({ lat: src.lat, lng: src.lng });
    let tapTimer = null;
    map.on('click', (ev) => { clearTimeout(tapTimer); tapTimer = setTimeout(() => place({ lat: ev.latlng.lat, lng: ev.latlng.lng }), 280); });
    map.on('dblclick zoomstart', () => clearTimeout(tapTimer));
    setTimeout(() => map.invalidateSize(), 50);
  }

  // ------------------------------------------------------------------ location tracking
  function setLocMode(mode) { if (S.loc.mode !== mode) { S.loc.mode = mode; refreshChip(); } }

  function startWatch() {
    if (!('geolocation' in navigator)) { setLocMode(S.me && S.me.lat != null ? 'manual' : 'off'); return; }
    if (S.loc.watchId != null) return;
    if (store.get('nb_locmode') === 'manual') { setLocMode('manual'); return; }
    setLocMode('waiting');
    S.loc.watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, { enableHighAccuracy: true, maximumAge: 60000, timeout: 30000 });
  }
  function stopWatch() {
    if (S.loc.watchId != null) { navigator.geolocation.clearWatch(S.loc.watchId); S.loc.watchId = null; }
  }
  function onPosition(pos) {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    S.loc.accuracy = pos.coords.accuracy;
    setLocMode('live');
    const moved = S.loc.last ? distKm(S.loc.last, p) : Infinity;
    if (moved < 0.15 && Date.now() - S.loc.sentAt < 180000) return;
    const firstFix = S.me && S.me.lat == null;
    S.loc.last = p;
    S.loc.sentAt = Date.now();
    api('POST', '/api/me/location', p).then((res) => {
      S.me = res.user;
      if (res.alerted) toast(`${res.alerted} new ${res.alerted === 1 ? 'request' : 'requests'} near you in the 3.5 km zone`);
      if (firstFix || ['nearby', 'trade'].includes(route().name)) render({ keepScroll: true });
    }).catch(() => {});
  }
  function onPositionError(err) {
    stopWatch();
    setLocMode(S.me && S.me.lat != null ? 'manual' : 'off');
    if (err.code === 1) toast('Location is blocked. Allow it in your browser settings, or pick your spot on the map.', true);
  }
  function useGpsNow() {
    store.set('nb_locmode', null);
    stopWatch();
    if (!('geolocation' in navigator)) { toast('This browser can’t share your location. Pick your spot on the map instead.', true); return; }
    S.loc.last = null; S.loc.sentAt = 0;
    startWatch();
    toast('Finding your location…');
  }

  // ------------------------------------------------------------------ live updates and push
  let stream = null;
  function startServices() {
    startWatch();
    if (!stream && window.EventSource) {
      stream = new EventSource('/api/stream?token=' + encodeURIComponent(S.token));
      stream.addEventListener('notification', (e) => {
        const n = JSON.parse(e.data);
        S.unread += 1;
        updateBadge();
        toast(n.title);
        onRefresh({ refType: n.ref_type, refId: n.ref_id });
      });
      stream.addEventListener('refresh', (e) => onRefresh(JSON.parse(e.data)));
    }
    api('GET', '/api/notifications').then((d) => { S.unread = d.unread; updateBadge(); }).catch(() => {});
  }
  function stopServices() {
    stopWatch();
    if (stream) { stream.close(); stream = null; }
  }
  function updateBadge() {
    const tab = document.querySelector('.tab[href="#/alerts"]');
    if (!tab) return;
    const b = tab.querySelector('.badge');
    if (!S.unread) { if (b) b.remove(); return; }
    if (b) b.textContent = S.unread > 99 ? '99+' : S.unread;
    else tab.insertAdjacentHTML('beforeend', `<span class="badge">${S.unread > 99 ? '99+' : S.unread}</span>`);
  }
  let refreshTimer;
  function onRefresh(ev) {
    const r = route();
    const relevant = (r.name === 'need' && ev.refType === 'need' && r.id === ev.refId) || (r.name === 'listing' && ev.refType === 'listing' && r.id === ev.refId) ||
      (r.name === 'nearby' && ev.refType === 'need') || (r.name === 'trade' && ev.refType === 'listing') || r.name === 'alerts';
    if (!relevant) return;
    const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.value;
    if (typing) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => render({ keepScroll: true }), 300);
  }

  const swReady = ('serviceWorker' in navigator) ? navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).catch(() => null) : Promise.resolve(null);
  function pushSupported() { return 'PushManager' in window && 'Notification' in window && S.meta && S.meta.vapidPublicKey; }
  async function pushState() {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await swReady;
    if (!reg) return 'unsupported';
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  }
  function b64ToBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  async function enablePush() {
    if (!pushSupported()) { toast('This browser can’t show alerts when the app is closed.', true); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Alerts are blocked. You can allow them later in your browser settings.', true); return false; }
    const reg = await swReady;
    if (!reg) { toast('Alerts need the app to be opened over HTTPS.', true); return false; }
    try {
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(S.meta.vapidPublicKey) });
      await api('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
      toast('Alerts are on.');
      return true;
    } catch (e) {
      toast(e.message || 'Alerts could not be turned on.', true);
      return false;
    }
  }
  async function disablePush() {
    const reg = await swReady;
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await api('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
    toast('Alerts are off for this phone.');
  }

  // ------------------------------------------------------------------ photos
  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Choose a photo (JPEG or PNG).')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let quality = 0.82;
        let out = c.toDataURL('image/jpeg', quality);
        while (out.length > 380000 && quality > 0.4) { quality -= 0.12; out = c.toDataURL('image/jpeg', quality); }
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo could not be read. Try another one.')); };
      img.src = url;
    });
  }

  // ------------------------------------------------------------------ session
  function signIn(token, user) {
    S.token = token; store.set('nb_token', token);
    S.me = user;
    startServices();
  }
  function signOut() {
    stopServices();
    S.token = null; S.me = null; S.unread = 0; S.ob = null; S.draft = { need: null, item: null };
    store.set('nb_ob', null);
    store.set('nb_token', null);
    location.hash = '#/';
    render();
  }

  // ------------------------------------------------------------------ actions
  async function run(fn) {
    try { await fn(); } catch (e) { toast(e.message, true); }
  }
  const A = {
    back: () => { if (history.length > 1) history.back(); else go('nearby'); },
    reload: () => location.reload(),
    'start-onboard': () => { S.ob = null; store.set('nb_ob', null); obInit(); },
    'ob-back': () => { S.ob.step = Math.max(1, S.ob.step - 1); paintRaw(viewOnboard()); },
    'ob-set': (el) => { S.ob[el.dataset.k] = el.dataset.v; keepForm(() => paintRaw(viewOnboard())); },
    'ob-photo-clear': () => { S.ob.photo = null; paintRaw(viewOnboard()); },
    'ob-next': () => { S.ob.step = 5; paintRaw(viewOnboard()); },
    'ob-push': () => run(async () => { await enablePush(); A['ob-done'](); }),
    'ob-done': () => { S.ob = null; store.set('nb_ob', null); location.hash = '#/nearby'; render(); },
    'copy-code': () => {
      const done = () => toast('Recovery code copied.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(S.token).then(done, () => toast('Copy failed. Select the code and copy it by hand.', true));
      else toast('Select the code and copy it by hand.', true);
    },
    'pick-me': () => { S.pickFor = 'me'; },
    'pick-need': () => { S.pickFor = 'need'; },
    'save-pin': () => run(async () => {
      if (!mapState || !mapState.point) return;
      const p = mapState.point;
      if (S.pickFor === 'need') { Object.assign(needDraft(), { lat: p.lat, lng: p.lng }); S.pickFor = 'me'; location.hash = '#/ask'; return; }
      stopWatch();
      store.set('nb_locmode', 'manual');
      const res = await api('POST', '/api/me/location', { ...p, manual: true });
      S.me = res.user;
      setLocMode('manual');
      toast(res.alerted ? `Location saved. ${res.alerted} new ${res.alerted === 1 ? 'request' : 'requests'} near you in the 3.5 km zone.` : 'Location saved.');
      go('nearby');
    }),
    'gps-now': () => { useGpsNow(); if (route().name === 'location') go('nearby'); },
    'feed-filter': (el) => { S.view.feedFilter = el.dataset.v; render({ keepScroll: true }); },
    'trade-tab': (el) => { S.view.tradeTab = el.dataset.v; render({ keepScroll: true }); },
    'confirm-take': () => { S.view.confirmTake = true; render({ keepScroll: true }); },
    'confirm-release': () => { S.view.confirmRelease = true; render({ keepScroll: true }); },
    'confirm-cancel': () => { S.view.confirmCancel = true; render({ keepScroll: true }); },
    'confirm-withdraw': () => { S.view.confirmWithdraw = true; render({ keepScroll: true }); },
    'confirm-delete': () => { S.view.confirmDelete = true; render({ keepScroll: true }); },
    'report-open': () => { S.view.reporting = true; render({ keepScroll: true }); },
    'cancel-confirm': () => { S.view = { tradeTab: S.view.tradeTab, feedFilter: S.view.feedFilter, chatWith: S.view.chatWith }; render({ keepScroll: true }); },
    take: (el) => needAction(el.dataset.id, 'take', 'Thank you. You’ll find the address and chat below.'),
    release: (el) => needAction(el.dataset.id, 'release', 'Okay. The request is open again for others.'),
    resolve: (el) => needAction(el.dataset.id, 'resolve', 'Marked resolved. Everyone who was alerted has been told.'),
    'cancel-need': (el) => needAction(el.dataset.id, 'cancel', 'Request cancelled.'),
    thank: (el) => needAction(el.dataset.id, 'thank', 'Your thanks has been sent.'),
    report: (el) => run(async () => {
      await api('POST', `/api/${el.dataset.type === 'need' ? 'needs' : 'listings'}/${el.dataset.id}/report`, { reason: el.dataset.reason });
      S.view.reporting = false;
      toast('Thanks. We’ve recorded your report.');
      render({ keepScroll: true });
    }),
    'draft-set': (el) => {
      const dr = needDraft();
      dr[el.dataset.k] = el.dataset.v;
      if (el.dataset.k === 'kind') { dr.profession = ''; dr.category = ''; }
      keepForm(() => render({ keepScroll: true }));
    },
    'item-set': (el) => { itemDraft()[el.dataset.k] = el.dataset.v; keepForm(() => render({ keepScroll: true })); },
    'item-photo-clear': () => { itemDraft().photo = null; render({ keepScroll: true }); },
    'chat-with': (el) => { S.view.chatWith = S.view.chatWith === el.dataset.v ? null : el.dataset.v; render({ keepScroll: true }); },
    accept: (el) => listingAction(el.dataset.id, 'accept', { buyerId: el.dataset.buyer }, 'Reserved. Agree pickup in the chat.'),
    sold: (el) => listingAction(el.dataset.id, 'sold', {}, 'Marked handed over.'),
    'release-listing': (el) => listingAction(el.dataset.id, 'release', {}, 'It’s available again.'),
    withdraw: (el) => run(async () => { await api('POST', `/api/listings/${el.dataset.id}/withdraw`, {}); toast('Item taken down.'); go('trade'); }),
    'withdraw-request': (el) => run(async () => { await api('DELETE', `/api/listings/${el.dataset.id}/request`); toast('Request withdrawn.'); go('trade'); }),
    'radius-set': (el) => run(async () => { S.me = (await api('PATCH', '/api/me', { radiusKm: Number(el.dataset.v) })).user; toast(`Nearby locality now means within ${S.me.radiusKm} km.`); render({ keepScroll: true }); }),
    'push-on': () => run(async () => { await enablePush(); render({ keepScroll: true }); }),
    'push-off': () => run(async () => { await disablePush(); render({ keepScroll: true }); }),
    'toggle-code': () => { S.view.showCode = !S.view.showCode; render({ keepScroll: true }); },
    'sign-out': () => signOut(),
    'delete-account': () => run(async () => { await api('DELETE', '/api/me'); toast('Your profile has been deleted.'); signOut(); }),
    'edit-set': (el) => { S.view.edit[el.dataset.k] = el.dataset.v; keepForm(() => render({ keepScroll: true })); },
    'edit-photo-clear': () => { S.view.edit.photo = null; keepForm(() => render({ keepScroll: true })); },
    'theme-set': (el) => { applyTheme(el.dataset.v); render({ keepScroll: true }); }
  };

  /** Re-render without losing what someone typed into the visible form. */
  function keepForm(paint) {
    const vals = {};
    appEl.querySelectorAll('input[id], textarea[id], select[id]').forEach((el) => { vals[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    const out = paint();
    const restore = () => Object.entries(vals).forEach(([id, v]) => { const el = document.getElementById(id); if (el && el.type !== 'file') { if (el.type === 'checkbox') el.checked = v; else el.value = v; } });
    if (out && out.then) out.then(restore); else restore();
  }

  function needAction(id, verb, msg) {
    return run(async () => {
      const d = await api('POST', `/api/needs/${id}/${verb}`, {});
      S.view = {};
      const n = d.need;
      const helperName = (n && n.helper && n.helper.firstName) || (S.me ? firstName(S.me.name) : 'You');
      const posterName = (n && n.poster && n.poster.firstName) || 'the neighbour';

      // Transparent Community Tracking: Apple-style Accountability notification toast
      const toastMsg = verb === 'take'
        ? `Responsibility Taken: ${helperName} is assisting ${posterName} • Notified across 3.5 km zone`
        : verb === 'resolve'
        ? `Need Satisfied: Marked resolved • Notified across 3.5 km zone`
        : msg;

      toast(toastMsg);
      if (route().name === 'need') { paintScreen(route(), { title: 'Request', back: true, body: needDetail(d) }); window.scrollTo(0, 0); } else render();
    });
  }

  function listingAction(id, verb, body, msg) {
    return run(async () => {
      const d = await api('POST', `/api/listings/${id}/${verb}`, body);
      S.view = { tradeTab: S.view.tradeTab };
      toast(msg);
      paintScreen(route(), { title: 'Item', back: true, body: listingDetail(d) });
    });
  }

  // ------------------------------------------------------------------ forms
  const F = {
    signin: (form) => run(async () => {
      const res = await api('POST', '/api/signin', { code: form.code.value.trim() });
      signIn(res.token, res.user);
      location.hash = '#/nearby';
      render();
    }),
    ob1: (form) => {
      const name = form.name.value.trim();
      if (name.length < 2) { toast('Please enter your name.', true); return; }
      S.ob.name = name; S.ob.step = 2; paintRaw(viewOnboard());
    },
    ob2: (form) => {
      const age = Number(form.age.value);
      if (!Number.isInteger(age) || age < 1 || age > 110) { toast('Please enter your age in years.', true); return; }
      const minAge = S.meta?.rules?.minSignupAge || 13;
      if (age < minAge) { toast(`You need to be ${minAge} or older to use Neighbours. Ask an adult to post for you, or call 1098.`, true); return; }
      if (!S.ob.gender) { toast('Please choose a gender.', true); return; }
      if (!S.ob.marital) { toast('Please choose married or unmarried.', true); return; }
      S.ob.age = age; S.ob.step = 3; paintRaw(viewOnboard());
    },
    ob3: (form) => run(async () => {
      const p = form.querySelector('input[name=profession]:checked');
      if (!p) throw new Error('Please choose a profession, or “Something else”.');
      const other = p.value === 'other' ? form.professionOther.value.trim() : '';
      if (p.value === 'other' && other.length < 2) throw new Error('Tell us what you do, in a few words.');
      Object.assign(S.ob, { profession: p.value, professionOther: other });
      const ob = S.ob;
      const res = await api('POST', '/api/signup', { name: ob.name, photo: ob.photo, age: Number(ob.age), gender: ob.gender, marital: ob.marital, profession: ob.profession, professionOther: ob.professionOther });
      store.set('nb_locmode', null); // follow the phone's GPS from the start
      signIn(res.token, res.user);
      ob.step = 4;
      paintRaw(viewOnboard());
    }),
    ask: () => run(async () => {
      const dr = needDraft();
      if (dr.kind === 'professional' && !dr.profession) throw new Error('Choose which professional you need.');
      if (dr.kind === 'general' && !dr.category) throw new Error('Choose what kind of help you need.');
      const res = await api('POST', '/api/needs', { ...dr, ...(dr.lat == null ? { lat: undefined, lng: undefined } : {}) });
      S.draft.need = null;
      toast(res.alerted ? `Posted. ${res.alerted} ${res.alerted === 1 ? 'neighbour was' : 'neighbours were'} alerted within 3.5 km.` : 'Posted. We’ll alert people as they come within range.');
      go(`need/${res.need.id}`);
    }),
    offer: () => run(async () => {
      const it = itemDraft();
      if (!it.title.trim()) throw new Error('Say what you are offering.');
      if (!it.category) throw new Error('Choose a category.');
      const res = await api('POST', '/api/listings', { ...it, price: it.free ? undefined : Number(it.price) });
      S.draft.item = null;
      toast('Your item is listed for neighbours nearby.');
      go(`listing/${res.listing.id}`);
    }),
    request: (form) => listingAction(form.dataset.id, 'request', { note: form.note.value }, 'Sent. The seller will reply here.'),
    'need-msg': (form) => run(async () => {
      const text = form.body.value.trim();
      if (!text) return;
      const d = await api('POST', `/api/needs/${form.dataset.id}/messages`, { body: text });
      paintScreen(route(), { title: 'Request', back: true, body: needDetail(d) });
      const box = document.getElementById('need-msg'); if (box) box.scrollIntoView({ block: 'center' });
    }),
    'listing-msg': (form) => run(async () => {
      const text = form.body.value.trim();
      if (!text) return;
      const d = await api('POST', `/api/listings/${form.dataset.id}/messages`, { body: text, buyerId: form.dataset.buyer });
      paintScreen(route(), { title: 'Item', back: true, body: listingDetail(d) });
    }),
    edit: (form) => run(async () => {
      const e = S.view.edit;
      if (form.profession.value === 'other' && form.professionOther.value.trim().length < 2) throw new Error('Tell us what you do, in a few words.');
      const res = await api('PATCH', '/api/me', { name: form.name.value, age: Number(form.age.value), gender: e.gender, marital: e.marital, profession: form.profession.value, professionOther: form.professionOther.value, photo: e.photo || '' });
      S.me = res.user;
      S.view.edit = null;
      toast('Profile saved.');
      go('me');
    })
  };

  // ------------------------------------------------------------------ events
  appEl.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'BUTTON' || el.dataset.act === 'start-onboard') { if (el.tagName === 'BUTTON') ev.preventDefault(); }
    fn(el, ev);
  });
  appEl.addEventListener('submit', (ev) => {
    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    const fn = F[form.dataset.form];
    if (fn) fn(form);
  });
  appEl.addEventListener('input', (ev) => {
    const el = ev.target;
    const bind = el.dataset && el.dataset.bind;
    if (!bind) return;
    const [scope, key] = bind.split('.');
    const target = scope === 'need' ? needDraft() : itemDraft();
    target[key] = el.type === 'checkbox' ? el.checked : el.value;
    if (scope === 'item' && key === 'free') { const pf = $('#price-field'); if (pf) pf.hidden = el.checked; }
  });
  appEl.addEventListener('change', (ev) => {
    const el = ev.target;
    if ((el.name === 'profession' && el.type === 'radio') || el.id === 'edit-prof') {
      const field = $(el.id === 'edit-prof' ? '#edit-other-field' : '#ob-other-field');
      if (field) { field.hidden = el.value !== 'other'; if (!field.hidden) field.querySelector('input').focus(); }
      if (el.type === 'radio' && S.ob) S.ob.profession = el.value;
    }
    if (el.dataset && el.dataset.bind && el.type === 'checkbox') el.dispatchEvent(new Event('input', { bubbles: true }));
    if (!el.dataset || !el.dataset.photo || !el.files || !el.files[0]) return;
    const which = el.dataset.photo;
    run(async () => {
      const data = await resizeImage(el.files[0], which === 'item' ? 900 : 360);
      if (which === 'ob') { S.ob.photo = data; keepForm(() => paintRaw(viewOnboard())); }
      if (which === 'item') { itemDraft().photo = data; keepForm(() => render({ keepScroll: true })); }
      if (which === 'edit') { S.view.edit.photo = data; keepForm(() => render({ keepScroll: true })); }
    });
  });
  // The first tap on "Need ... profession/category" chips should refresh the audience estimate.
  appEl.addEventListener('click', (ev) => { if (ev.target.closest('[data-act="draft-set"]')) setTimeout(updateAudience, 0); });
  window.addEventListener('online', () => { if (S.token) render({ keepScroll: true }); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token && S.me) { api('GET', '/api/notifications').then((d) => { S.unread = d.unread; updateBadge(); }).catch(() => {}); } });

  applyTheme(getTheme());
  render();
})();
