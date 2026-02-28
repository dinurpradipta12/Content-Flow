/**
 * Web Push Notification Service
 *
 * ── HOW WEB PUSH WORKS ────────────────────────────────────────────────────────
 *
 * Web Push allows your app to send notifications to users even when the browser
 * is closed or the app is in the background. It works on:
 *   ✅ Android Chrome/Firefox/Edge
 *   ✅ Desktop Chrome/Firefox/Edge/Safari (macOS 13+)
 *   ✅ iPad/iPhone Safari (iOS 16.4+ when added to Home Screen as PWA)
 *   ❌ iOS Safari in browser (not supported, must be PWA)
 *
 * ── SETUP REQUIRED ────────────────────────────────────────────────────────────
 *
 * 1. Generate VAPID keys (one-time setup):
 *    npx web-push generate-vapid-keys
 *    → Add VITE_VAPID_PUBLIC_KEY to your .env file
 *    → Add VAPID_PRIVATE_KEY to your Supabase Edge Function secrets
 *
 * 2. Create Supabase table for subscriptions:
 *    See: sql/push_subscriptions.sql
 *
 * 3. Create Supabase Edge Function to send pushes:
 *    See: supabase/functions/send-push/index.ts
 *
 * 4. Call registerPushNotifications() after user logs in
 *
 * ── FLOW ──────────────────────────────────────────────────────────────────────
 *
 *  User logs in
 *    → registerPushNotifications()
 *    → Browser asks for permission
 *    → Subscribe to push service (generates endpoint + keys)
 *    → Save subscription to Supabase push_subscriptions table
 *
 *  When notification is sent (from NotificationProvider):
 *    → Supabase Edge Function reads push_subscriptions for recipient
 *    → Sends push via web-push library to browser's push service
 *    → Service Worker (sw.js) receives push event
 *    → Shows native OS notification
 */

import { supabase } from './supabaseClient';

// VAPID public key from environment (generate with: npx web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Check if Web Push is supported in this browser
 */
export const isPushSupported = (): boolean => {
    return 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
};

/**
 * Request notification permission from the browser.
 * This shows the native browser permission dialog.
 * Works even without VAPID keys.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission !== 'default') return Notification.permission;

    try {
        const permission = await Notification.requestPermission();
        console.log('[Push] Permission result:', permission);
        return permission;
    } catch (err) {
        console.error('[Push] Permission request failed:', err);
        return 'denied';
    }
};

/**
 * Register service worker and subscribe to push notifications.
 * Requires VAPID keys for background push (when app is closed).
 * If no VAPID key, still registers SW and requests permission for local notifications.
 */
export const registerPushNotifications = async (userId: string): Promise<boolean> => {
    if (!isPushSupported()) {
        console.log('[Push] Web Push not supported in this browser');
        return false;
    }

    try {
        // 1. Register service worker (works without VAPID)
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('[Push] Service Worker registered:', registration.scope);

        // 2. Request notification permission
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.log('[Push] Permission not granted:', permission);
            return false;
        }

        // 3. Update app badge if supported
        if ('setAppBadge' in navigator) {
            (navigator as any).setAppBadge(0).catch(() => {});
        }

        // 4. Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'NOTIFICATION_CLICK') {
                window.dispatchEvent(new CustomEvent('push-notification-click', {
                    detail: event.data.data
                }));
            }
            if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
                registerPushNotifications(userId);
            }
        });

        // 5. Subscribe to push (requires VAPID key for background push)
        if (!VAPID_PUBLIC_KEY) {
            console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set. Background push disabled, but local notifications work.');
            return true; // Still return true - permission granted, SW registered
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('[Push] Push subscription created:', subscription.endpoint);

        // 6. Save subscription to Supabase
        const subscriptionJSON = subscription.toJSON();
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscriptionJSON.endpoint,
                p256dh: subscriptionJSON.keys?.p256dh,
                auth: subscriptionJSON.keys?.auth,
                user_agent: navigator.userAgent,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,endpoint'
            });

        if (error) {
            console.error('[Push] Failed to save subscription:', error);
            // Don't return false - permission and SW are still working
        } else {
            console.log('[Push] Push subscription saved to database');
        }

        return true;
    } catch (err) {
        console.error('[Push] Registration failed:', err);
        return false;
    }
};

/**
 * Unsubscribe from push notifications (e.g., on logout)
 */
export const unregisterPushNotifications = async (userId: string): Promise<void> => {
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration('/sw.js');
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();

                    // Remove from database
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', userId)
                        .eq('endpoint', subscription.endpoint);

                    console.log('[Push] Unsubscribed');
                }
            }
        }
    } catch (err) {
        console.error('[Push] Unsubscribe failed:', err);
    }
};

/**
 * Show a local notification (no server needed, works when app is open)
 * Useful as a fallback when the app is in the foreground
 */
export const showLocalNotification = async (title: string, options?: NotificationOptions): Promise<void> => {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'granted') return;

    try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (registration) {
            await registration.showNotification(title, {
                icon: '/icon-192.png',
                badge: '/icon-72.png',
                vibrate: [100, 50, 100],
                ...options
            });
        }
    } catch (err) {
        // Fallback to basic Notification API
        new Notification(title, options);
    }
};
