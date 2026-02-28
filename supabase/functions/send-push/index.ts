/**
 * Supabase Edge Function: send-push
 *
 * Sends Web Push Notifications to subscribed devices.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────────
 *
 * 1. Install web-push: (handled by Deno import)
 *
 * 2. Set Edge Function secrets in Supabase Dashboard:
 *    supabase secrets set VAPID_PUBLIC_KEY=<your-public-key>
 *    supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
 *    supabase secrets set VAPID_EMAIL=mailto:your@email.com
 *
 * 3. Deploy:
 *    supabase functions deploy send-push
 *
 * 4. Call from NotificationProvider after inserting a notification:
 *    await supabase.functions.invoke('send-push', {
 *      body: { recipient_id: userId, title: '...', body: '...', url: '/plan/...' }
 *    })
 *
 * ── HOW TO TRIGGER ────────────────────────────────────────────────────────────
 *
 * Option A: Call from client (NotificationProvider.sendNotification)
 * Option B: Supabase Database Webhook on notifications INSERT
 *   → Go to Supabase Dashboard → Database → Webhooks
 *   → Create webhook on notifications table INSERT
 *   → Point to this Edge Function URL
 *   → This sends push automatically whenever a notification is inserted!
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// VAPID keys from environment secrets
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@example.com';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ── VAPID Signing (manual implementation for Deno) ────────────────────────────
async function generateVapidHeaders(endpoint: string, publicKey: string, privateKey: string, email: string) {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = {
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: email
    };

    const encode = (obj: object) => btoa(JSON.stringify(obj))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const signingInput = `${encode(header)}.${encode(payload)}`;

    // Import private key
    const keyData = Uint8Array.from(atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyData,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        new TextEncoder().encode(signingInput)
    );

    const token = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

    return {
        Authorization: `vapid t=${token}, k=${publicKey}`,
        'Content-Type': 'application/json',
        TTL: '86400'
    };
}

// ── Send push to a single subscription ───────────────────────────────────────
async function sendPushToSubscription(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: object
): Promise<{ success: boolean; error?: string }> {
    try {
        const headers = await generateVapidHeaders(
            subscription.endpoint,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
            VAPID_EMAIL
        );

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (response.status === 410 || response.status === 404) {
            // Subscription expired/invalid
            return { success: false, error: 'subscription_expired' };
        }

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

// ── Main Handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    try {
        const body = await req.json();
        const { recipient_id, title, message, url, icon, tag } = body;

        if (!recipient_id || !title) {
            return new Response(JSON.stringify({ error: 'recipient_id and title are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Initialize Supabase with service role
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Get all push subscriptions for this user
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', recipient_id);

        if (error || !subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const pushPayload = {
            title,
            body: message || title,
            icon: icon || '/icon-192.png',
            badge: '/icon-72.png',
            tag: tag || 'contentflow',
            data: { url: url || '/' }
        };

        // Send to all subscriptions (user may have multiple devices)
        const results = await Promise.all(
            subscriptions.map(sub => sendPushToSubscription(sub, pushPayload))
        );

        // Clean up expired subscriptions
        const expiredEndpoints = subscriptions
            .filter((_, i) => results[i].error === 'subscription_expired')
            .map(s => s.endpoint);

        if (expiredEndpoints.length > 0) {
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', recipient_id)
                .in('endpoint', expiredEndpoints);
        }

        const sent = results.filter(r => r.success).length;

        return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('[send-push] Error:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
