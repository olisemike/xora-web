// Xora Social - Service Worker (Frontend Fixed)
// Version 1.0.1

const CACHE_NAME = 'xora-social-v1';
const RUNTIME_CACHE = 'xora-runtime-v1';

// Only precache files that definitely exist
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  if (self && self.location && self.location.hostname === 'localhost') {
    console.log('[Service Worker] Installing...');
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        if (self && self.location && self.location.hostname === 'localhost') {
          console.log('[Service Worker] Precaching assets');
        }
        // Use addAll but catch errors gracefully
        return cache.addAll(PRECACHE_ASSETS).catch((error) => {
          console.warn('[Service Worker] Some assets failed to cache:', error);
          // Continue anyway - don't fail install
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  if (self && self.location && self.location.hostname === 'localhost') {
    console.log('[Service Worker] Activating...');
  }
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            if (self && self.location && self.location.hostname === 'localhost') {
              console.log('[Service Worker] Deleting old cache:', cacheName);
            }
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, then cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip chrome extensions and non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network only (don't cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets - Cache first, then network
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          // Don't cache opaque responses or errors
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          
          const responseToCache = response.clone();
          return caches.open(RUNTIME_CACHE).then((cache) => {
            return cache.put(request, responseToCache);
          }).catch(() => {
            // Ignore cache errors
          }).then(() => response);
        }).catch(() => {
          // Return a fallback for images if offline
          if (request.destination === 'image') {
            return new Response(
              '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#1a1a1a"/><text x="50" y="50" text-anchor="middle" fill="#666" font-size="12">Offline</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // HTML pages - Network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache the new version only for GET requests
        if (request.method === 'GET') {
          caches.open(RUNTIME_CACHE).then((cache) => {
            return cache.put(request, responseToCache);
          }).catch(() => {
            // Ignore cache errors
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page if available
          return caches.match('/offline.html').then((offlinePage) => {
            return offlinePage || new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    image: data.image,
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    tag: data.tag || 'notification',
    renotify: true,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Xora Social', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
          return undefined;
        })
    );
  }
});

// Helper function to sync posts (for background sync)
async function syncPosts() {
  try {
    // Get pending posts from IndexedDB
    // Send to API
    // Remove from IndexedDB on success
    if (self && self.location && self.location.hostname === 'localhost') {
      console.log('[Service Worker] Syncing posts...');
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const {urls} = event.data;
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(urls).catch((error) => {
          console.warn('[Service Worker] Failed to cache some URLs:', error);
        });
      })
    );
  }
});
