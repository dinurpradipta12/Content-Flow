import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const UserPresence = () => {
    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        const userAvatar = localStorage.getItem('user_avatar');
        const userName = localStorage.getItem('user_name');
        if (!userId) return;

        // Initialize Realtime Channel for Presence (In-memory, light on DB)
        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        // BACKGROUND: Sync to DB once in a while (10 mins) for persistence
        const syncToDatabase = async (status: string) => {
            const lastSync = Number(sessionStorage.getItem('last_presence_db_sync') || 0);
            const now = Date.now();
            if (now - lastSync < 10 * 60 * 1000 && status === 'online') return;

            try {
                sessionStorage.setItem('last_presence_db_sync', now.toString());
                await supabase.from('app_users')
                    .update({ online_status: status, last_activity_at: new Date().toISOString() })
                    .eq('id', userId);
            } catch (err) { /* ignore */ }
        };

        const trackPresence = (status: 'online' | 'idle') => {
            channel.track({
                id: userId,
                name: userName || 'User',
                avatar: userAvatar,
                status,
                online_at: new Date().toISOString(),
            });
            syncToDatabase(status);
        };

        let idleTimer: NodeJS.Timeout;
        const IDLE_TIMEOUT = 5 * 60 * 1000;

        const handleActivity = () => {
            clearTimeout(idleTimer);
            const lastStatus = sessionStorage.getItem('last_presence_status');
            if (lastStatus !== 'online') {
                sessionStorage.setItem('last_presence_status', 'online');
                trackPresence('online');
            }
            idleTimer = setTimeout(() => {
                sessionStorage.setItem('last_presence_status', 'idle');
                trackPresence('idle');
            }, IDLE_TIMEOUT);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                handleActivity();
            }
        });

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            clearTimeout(idleTimer);
            supabase.removeChannel(channel);
        };
    }, []);

    return null; // This component doesn't render anything
};
