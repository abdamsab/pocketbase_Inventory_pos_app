const CACHE_NAME = 'nexus-pos-v1';
const API_CACHE_NAME = 'nexus-pos-api-v1';

// Static assets to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  // Add other static assets as needed
];

// API endpoints that should be cached for offline use
const API_CACHE_PATTERNS = [
  /\/api\/collections\/products/,
  /\/api\/collections\/categories/,
  /\/api\/collections\/suppliers/,
];

// Don't cache these patterns
const EXCLUDE_PATTERNS = [
  /\/api\/admin\//, // Admin operations
  /\/api\/collections\/sales/, // Real-time sales (POST requests)
  /\/api\/collections\/inventory_entries/, // Real-time inventory
  /\/_\/*/, // PocketBase internal routes
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching static assets');

      try {
        await cache.addAll(STATIC_CACHE_URLS);
        console.log('[SW] Static assets cached successfully');
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
        // Continue with installation even if caching fails
      }

      // Force the waiting service worker to become the active service worker
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name =>
        name !== CACHE_NAME && name !== API_CACHE_NAME
      );

      await Promise.all(
        oldCaches.map(cacheName => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );

      // Take control of all clients
      await self.clients.claim();
      console.log('[SW] Service worker activated and controlling clients');
    })()
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!url.origin.includes(self.location.origin) && !url.origin.includes('127.0.0.1')) {
    return;
  }

  // Handle API requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  if (isStaticAsset(url) || isPageRequest(request)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

function isPageRequest(request) {
  return request.destination === 'document' ||
         request.headers.get('accept').includes('text/html');
}

function shouldExcludeRequest(url) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Don't cache excluded patterns
  if (shouldExcludeRequest(url)) {
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Network unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache for:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // No cache available
    return new Response(JSON.stringify({
      error: 'Network unavailable and no cached data',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStaticRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // For pages, return offline fallback
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // No fallback available
    return new Response('Offline - Content not available', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: '1.0.0' });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // This will be implemented when we add the offline queue management
  console.log('[SW] Syncing pending data...');
  // TODO: Implement sync logic
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (event.data) {
    const data = event.data.json();
    // Handle push notification
    console.log('[SW] Push data:', data);
  }
});