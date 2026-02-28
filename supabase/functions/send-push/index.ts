/**
 * Supabase Edge Function: send-push
 *
 * Mengirim Web Push Notifications ke device yang sudah subscribe.
 *
 * Bisa dipanggil dengan 2 cara:
 *
 * 1. Database Webhook (otomatis saat INSERT ke tabel notifications):
 *    Body yang dikirim Supabase:
 *    { "type": "INSERT", "table": "notifications", "record": { "recipient_id": "...", "title": "...", "content": "..." }, ... }
 *
 * 2. Manual dari client/server:
 *    { "recipient_id": "...", "title": "...", "message": "...", "url": "/" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@example.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ── VAPID JWT Signing ─────────────────────────────────────────────────────────
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

    const keyData = Uint8Array.from(
        atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
    );

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

    const token = `${signingInput}.${
        btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }`;

    return {
        Authorization: `vapid t=${token}, k=${publicKey}`,
        'Content-Type': 'application/json',
        TTL: '86400'
    };
}

// ── Send push to one subscription ────────────────────────────────────────────
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
    // Handle CORS preflight
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

        // ── Parse payload: support both Webhook format and manual format ──────
        let recipient_id: string;
        let title: string;
        let message: string;
        let url: string = '/';

        if (body.type === 'INSERT' && body.record) {
            // Format dari Database Webhook Supabase
            const record = body.record;
            recipient_id = record.recipient_id;
            title = record.title || 'Notifikasi Baru';
            message = record.content || record.title || '';
            url = '/';
        } else {
            // Format manual
            recipient_id = body.recipient_id;
            title = body.title;
            message = body.message || body.content || title;
            url = body.url || '/';
        }

        if (!recipient_id || !title) {
            return new Response(
                JSON.stringify({ error: 'recipient_id and title are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ── Get push subscriptions for this user ──────────────────────────────
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', recipient_id);

        if (error || !subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ sent: 0, message: 'No subscriptions found' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ── Build push payload ────────────────────────────────────────────────
        const pushPayload = {
            title,
            body: message,
            icon: '/icon-192.png',
            badge: '/icon-72.png',
            tag: 'contentflow',
            data: { url }
        };

        // ── Send to all devices ───────────────────────────────────────────────
        const results = await Promise.all(
            subscriptions.map(sub => sendPushToSubscription(sub, pushPayload))
        );

        // ── Clean up expired subscriptions ────────────────────────────────────
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

        return new Response(
            JSON.stringify({ sent, total: subscriptions.length }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('[send-push] Error:', err);
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
