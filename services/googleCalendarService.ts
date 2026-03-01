import { supabase } from './supabaseClient';

// GOOGLE CALENDAR SERVICE
// Requirements:
// 1. Google Cloud Console Project
// 2. Google Calendar API Enabled
// 3. OAuth 2.0 Client ID (Web Application)
// 4. Authorized Redirect URI: http://localhost:5173 (or your production URL)

const CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export const googleCalendarService = {
    // 1. Initiate Google Login / Connect
    connect: async () => {
        return new Promise((resolve, reject) => {
            try {
                // @ts-ignore - Google Identity Services is loaded via script in index.html
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: async (response: any) => {
                        if (response.error) {
                            reject(response.error);
                            return;
                        }

                        // Save Token to Supabase
                        const userId = localStorage.getItem('user_id');
                        if (!userId) return;

                        const expiry = new Date();
                        expiry.setSeconds(expiry.getSeconds() + response.expires_in);

                        const { error } = await supabase.from('app_users').update({
                            gcal_access_token: response.access_token,
                            gcal_token_expiry: expiry.toISOString()
                        }).eq('id', userId);

                        if (error) reject(error);
                        else resolve(response.access_token);
                    },
                });
                client.requestAccessToken();
            } catch (err) {
                reject(err);
            }
        });
    },

    // 2. Get Valid Token (Refresh if needed - note: GIS implicit flow doesn't give refresh token easily without server)
    getValidToken: async () => {
        const userId = localStorage.getItem('user_id');
        const { data: user } = await supabase.from('app_users').select('gcal_access_token, gcal_token_expiry').eq('id', userId || '').single();

        if (!user || !user.gcal_access_token) return null;

        // Check expiry
        const now = new Date();
        const expiry = new Date(user.gcal_token_expiry);
        if (now > expiry) {
            // Token expired, need to reconnect
            return null;
        }

        return user.gcal_access_token;
    },

    // 3. Sync Content Item to GCal
    syncEvent: async (item: any) => {
        const token = await googleCalendarService.getValidToken();
        if (!token) {
            console.warn("Google Calendar not connected or token expired.");
            return;
        }

        if (!item.date) return;

        const event = {
            summary: `[${item.platform}] ${item.title}`,
            description: `Pillar: ${item.pillar}\nStatus: ${item.status}\nLink: ${item.content_link || '-'}`,
            start: {
                dateTime: `${item.date}T${item.publish_time || '09:00'}:00`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
                dateTime: `${item.date}T${item.publish_time ? (parseInt(item.publish_time.split(':')[0]) + 1).toString().padStart(2, '0') + ':' + item.publish_time.split(':')[1] : '10:00'}:00`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        const method = item.gcal_event_id ? 'PUT' : 'POST';
        const url = item.gcal_event_id
            ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${item.gcal_event_id}`
            : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });

            const data = await response.json();
            if (data.id && !item.gcal_event_id) {
                // Update Supabase with GCal Event ID
                await supabase.from('content_items').update({ gcal_event_id: data.id }).eq('id', item.id);
            }
            return data;
        } catch (err) {
            console.error("GCal Sync Error:", err);
        }
    }
};
