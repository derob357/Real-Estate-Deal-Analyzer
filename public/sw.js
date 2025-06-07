const CACHE_NAME = 'cre-analyzer-v1.0.0'
const OFFLINE_URL = '/offline.html'

// Assets to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints to cache responses
const API_CACHE_PATTERNS = [
  /\/api\/market-data\/.*/,
  /\/api\/properties\/search.*/,
  /\/api\/tax-assessor\/.*/
]

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...')

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME)
        console.log('📦 Service Worker: Caching static assets')
        await cache.addAll(STATIC_CACHE_URLS)

        // Skip waiting to activate immediately
        await self.skipWaiting()
        console.log('✅ Service Worker: Installation complete')
      } catch (error) {
        console.error('❌ Service Worker: Installation failed', error)
      }
    })()
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...')

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys()
        const deletePromises = cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(`🗑️ Service Worker: Deleting old cache ${name}`)
            return caches.delete(name)
          })

        await Promise.all(deletePromises)

        // Take control of all pages
        await self.clients.claim()
        console.log('✅ Service Worker: Activation complete')
      } catch (error) {
        console.error('❌ Service Worker: Activation failed', error)
      }
    })()
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return
  }

  event.respondWith(handleFetch(request))
})

async function handleFetch(request) {
  const url = new URL(request.url)

  try {
    // Strategy 1: Network First for API calls (with cache fallback)
    if (url.pathname.startsWith('/api/')) {
      return await networkFirstStrategy(request)
    }

    // Strategy 2: Cache First for static assets
    if (isStaticAsset(url.pathname)) {
      return await cacheFirstStrategy(request)
    }

    // Strategy 3: Stale While Revalidate for pages
    return await staleWhileRevalidateStrategy(request)

  } catch (error) {
    console.error('🚨 Service Worker: Fetch failed', error)

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME)
      return await cache.match(OFFLINE_URL)
    }

    // Return a basic offline response for other requests
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Network First Strategy - for API calls
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    // Try network first
    const networkResponse = await fetch(request)

    // Cache successful API responses (but not errors)
    if (networkResponse.ok && shouldCacheAPIResponse(request)) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('🔄 Service Worker: Network failed, trying cache', request.url)

    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return offline data if available
    return createOfflineAPIResponse(request)
  }
}

// Cache First Strategy - for static assets
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  // If not in cache, fetch and cache
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('🚨 Service Worker: Failed to fetch static asset', request.url)
    throw error
  }
}

// Stale While Revalidate Strategy - for pages
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => {
    // Ignore network errors for background updates
  })

  // Return cached version immediately, or wait for network if no cache
  return cachedResponse || fetchPromise
}

// Helper functions
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2']
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/_next/static/') ||
         pathname === '/manifest.json'
}

function shouldCacheAPIResponse(request) {
  const url = new URL(request.url)
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
}

function createOfflineAPIResponse(request) {
  const url = new URL(request.url)

  // Return mock data for specific API endpoints when offline
  if (url.pathname.includes('/api/market-data/')) {
    return new Response(JSON.stringify({
      marketData: {
        zipCode: url.pathname.split('/').pop(),
        avgCapRate: 0.055,
        avgRentPerUnit: 1200,
        vacancyRate: 0.05,
        medianPrice: 850000,
        priceGrowth: 0.03,
        totalProperties: 25,
        marketTrend: 'stable',
        lastUpdated: new Date().toISOString(),
        offline: true
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (url.pathname.includes('/api/properties/search')) {
    return new Response(JSON.stringify({
      properties: [],
      message: 'Offline - cached properties not available',
      offline: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Default offline response
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'This feature requires an internet connection',
    offline: true
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Background sync for property alerts
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag)

  if (event.tag === 'property-alerts-sync') {
    event.waitUntil(syncPropertyAlerts())
  }

  if (event.tag === 'portfolio-sync') {
    event.waitUntil(syncPortfolioData())
  }
})

async function syncPropertyAlerts() {
  try {
    console.log('📬 Service Worker: Syncing property alerts...')

    // Get pending alerts from IndexedDB (would be implemented)
    const pendingAlerts = await getPendingAlerts()

    for (const alert of pendingAlerts) {
      try {
        await fetch('/api/alerts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        })

        // Remove from pending queue
        await removePendingAlert(alert.id)
      } catch (error) {
        console.error('Failed to sync alert:', alert.id, error)
      }
    }

    console.log('✅ Service Worker: Property alerts sync complete')
  } catch (error) {
    console.error('❌ Service Worker: Alert sync failed', error)
  }
}

async function syncPortfolioData() {
  try {
    console.log('📊 Service Worker: Syncing portfolio data...')

    // Sync portfolio changes (would be implemented with IndexedDB)
    const pendingChanges = await getPendingPortfolioChanges()

    for (const change of pendingChanges) {
      try {
        await fetch('/api/portfolio/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        })

        await removePendingPortfolioChange(change.id)
      } catch (error) {
        console.error('Failed to sync portfolio change:', change.id, error)
      }
    }

    console.log('✅ Service Worker: Portfolio sync complete')
  } catch (error) {
    console.error('❌ Service Worker: Portfolio sync failed', error)
  }
}

// Push notifications for property alerts
self.addEventListener('push', event => {
  console.log('🔔 Service Worker: Push notification received')

  if (!event.data) {
    console.log('Push event has no data')
    return
  }

  try {
    const data = event.data.json()
    const options = {
      body: data.body || 'New property alert available',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: data.tag || 'property-alert',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Property',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/icon-96x96.png'
        }
      ],
      requireInteraction: true,
      silent: false
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'CRE Analyzer', options)
    )
  } catch (error) {
    console.error('Push notification error:', error)
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔔 Service Worker: Notification clicked', event.action)

  event.notification.close()

  if (event.action === 'view') {
    // Open the app to the relevant page
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/?tab=alerts')
    )
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Placeholder functions for IndexedDB operations (would be fully implemented)
async function getPendingAlerts() {
  // Implementation would use IndexedDB to store offline alerts
  return []
}

async function removePendingAlert(id) {
  // Implementation would remove alert from IndexedDB
  console.log('Removing pending alert:', id)
}

async function getPendingPortfolioChanges() {
  // Implementation would get pending portfolio changes from IndexedDB
  return []
}

async function removePendingPortfolioChange(id) {
  // Implementation would remove portfolio change from IndexedDB
  console.log('Removing pending portfolio change:', id)
}

console.log('📱 Service Worker: Script loaded successfully')
