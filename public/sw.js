/**
 * Service Worker for Web Push Notifications
 * This enables native push notifications on mobile and desktop browsers.
 *
 * HOW IT WORKS:
 * 1. The app registers this service worker on load
 * 2. User grants notification permission
 * 3. Browser generates a unique push subscription (endpoint + keys)
 * 4. Subscription is saved to Supabase (push_subscriptions table)
 * 5. When a notification is sent via Supabase Edge Function, the browser
 *    receives it even when the app is closed/backgrounded
 */

const CACHE_NAME = 'contentflow-v1';

// ── Message Handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] SKIP_WAITING received, activating new SW...');
        self.skipWaiting();
    }
});

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installed');
    self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activated');
    
    // Clear old caches and cache bust manifest.json
    event.waitUntil(
        (async () => {
            // Delete old cache versions
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
            
            // Force refresh manifest.json by removing it from cache
            const cache = await caches.open(CACHE_NAME);
            cache.delete('/manifest.json');
            
            await clients.claim();
        })()
    );
});

// ── Push Event: Show native notification ─────────────────────────────────────
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

    let data = {
        title: 'Notifikasi Baru',
        body: 'Anda memiliki notifikasi baru',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: 'contentflow-notif',
        data: {}
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-72.png',
        tag: data.tag || 'contentflow-notif',
        data: data.data || {},
        vibrate: [100, 50, 100],
        requireInteraction: false,
        silent: false,
        actions: [
            { action: 'open', title: 'Buka' },
            { action: 'dismiss', title: 'Tutup' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'dismiss') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// ── Push Subscription Change ──────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[SW] Push subscription changed');
    // Re-subscribe and update in database
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription?.options?.applicationServerKey
        }).then((subscription) => {
            // Notify the app to update the subscription in the database
            return clients.matchAll().then((clientList) => {
                clientList.forEach(client => {
                    client.postMessage({
                        type: 'PUSH_SUBSCRIPTION_CHANGED',
                        subscription: subscription.toJSON()
                    });
                });
            });
        })
    );
});
