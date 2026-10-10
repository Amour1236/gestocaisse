/**
 * Service Worker GestoCaisse — Mode offline-first
 * Stratégie : Cache-First pour les assets statiques, Network-First pour les API
 */

const CACHE_NAME = 'gestocaisse-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Logo.png',
  '/logo-gestocaisse.svg',
];

// ─── Installation ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des assets statiques');
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] Certains assets n\'ont pas pu être mis en cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activation ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Suppression de l\'ancien cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension:// and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // API requests : Network-First avec fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache les réponses API en cas de succès (GET list)
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Hors ligne : retourner la réponse en cache
          return caches.match(request).then(cached => {
            if (cached) return cached;
            // Fallback : réponse JSON d'erreur
            return new Response(
              JSON.stringify({ success: false, message: 'Hors ligne. Cette donnée est en cache.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Assets statiques (JS, CSS, images) : Cache-First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|eot|ico|webp)$/) ||
    url.pathname.startsWith('/static/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation (HTML) : Network-First avec fallback sur cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Par défaut : network only
});

// ─── Messages du client ─────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.action === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0]?.postMessage({ ok: true });
      })
    );
  }
});

// ─── Notifications push (pour les rappels de crédit) ───────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'Notification GestoCaisse',
    icon: '/Logo.png',
    badge: '/Logo.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'GestoCaisse', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
