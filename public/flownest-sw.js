/* FlowNest web — offline app shell.
 *
 * Why: without this file the WEBSITE itself cannot open when there is no network (the browser has nothing
 * to load), so offline scanning would only work in a tab that was already open. With it, the page + JS
 * bundle + fonts are kept in the browser and the site opens offline after it was opened once online.
 *
 * What it touches: ONLY same-origin GET files of the site (index.html, /_expo/*, /assets/*, fonts, icons).
 * It never touches API calls (other domain), version.json or app-update.json, so the existing
 * "New update available — Refresh" flow keeps working exactly as before.
 */
const CACHE = 'flownest-shell-v1';
const SHELL = '/';
const NEVER = ['/version.json', '/app-update.json', '/flownest-sw.js'];
const STATIC = /^\/(_expo|assets)\//;
const STATIC_EXT = /\.(js|css|ttf|otf|woff2?|png|jpe?g|gif|svg|ico|webp|json|lottie|wasm)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(new Request(SHELL, { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('flownest-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function put(req, res) {
  if (!res || !res.ok || res.type === 'opaque') return;
  try {
    const c = await caches.open(CACHE);
    await c.put(req, res);
  } catch (e) {
    /* storage full — the site still works online */
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API + CDN calls: untouched
  if (NEVER.includes(url.pathname)) return;

  // Opening / refreshing any page of the app: fresh copy when online, saved copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) put(SHELL, res.clone());
          return res;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || Response.error())),
    );
    return;
  }

  // Bundle / fonts / images (file names carry a content hash): saved copy first.
  if (STATIC.test(url.pathname) || STATIC_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            put(req, res.clone());
            return res;
          }),
      ),
    );
  }
});

// The page tells us which files it is running from (they were loaded before this worker took control).
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type !== 'PRECACHE' || !Array.isArray(d.urls)) return;
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      const want = d.urls.filter((u) => {
        try {
          const x = new URL(u, self.location.origin);
          return x.origin === self.location.origin && !NEVER.includes(x.pathname) && (STATIC.test(x.pathname) || STATIC_EXT.test(x.pathname));
        } catch (e) {
          return false;
        }
      });
      for (const u of want) {
        try {
          if (!(await c.match(u))) await c.add(u);
        } catch (e) {
          /* skip this file */
        }
      }
      // drop JS bundles of older builds
      const keep = new Set(want.map((u) => new URL(u, self.location.origin).pathname));
      if (![...keep].some((p) => p.startsWith('/_expo/static/js/'))) return; // current bundle unknown -> delete nothing
      const keys = await c.keys();
      await Promise.all(
        keys
          .filter((k) => {
            const p = new URL(k.url).pathname;
            return p.startsWith('/_expo/static/js/') && !keep.has(p);
          })
          .map((k) => c.delete(k)),
      );
    })(),
  );
});


/* ---- Support Desk: browser notifications (Web Push) ----
 * Shows what the server sends (new ticket, reply, chat message, broadcast) and opens IT Desk /
 * Support with the ticket / chat when clicked. Same worker as the offline shell (one per site). */
self.addEventListener('push', function (e) {
  var m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { title: 'FlowNest', body: e.data ? e.data.text() : '' }; }
  var d = m.data || {};
  var q = [];
  if (d.ticket_id) q.push('ticket=' + d.ticket_id);
  if (d.room_id) q.push('chat=' + d.room_id);
  if (d.note_id) q.push('note=' + d.note_id);
  var url = (d.path || '/') + (q.length ? '?' + q.join('&') : '');
  e.waitUntil(self.registration.showNotification(m.title || 'FlowNest', {
    body: m.body || '',
    tag: m.tag || d.tag || undefined,
    renotify: !!(m.tag || d.tag),
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: url },
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ('focus' in c) { c.postMessage({ type: 'support-open', url: url }); return c.focus().then(function (w) { return w && w.navigate ? w.navigate(url) : w; }).catch(function () {}); }
    }
    return self.clients.openWindow(url);
  }));
});
