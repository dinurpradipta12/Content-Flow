import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const UserPresence = () => {
    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        let idleTimer: NodeJS.Timeout;
        const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

        const updateStatus = async (status: 'online' | 'idle' | 'offline', force = false) => {
            // Rate limit updates: don't update if same status was sent recently, 
            // unless it's a critical change (online -> idle/offline)
            const now = Date.now();
            const lastUpdate = Number(sessionStorage.getItem('last_presence_update') || 0);
            const lastStatus = sessionStorage.getItem('last_presence_status');

            if (!force && status === 'online' && lastStatus === 'online' && (now - lastUpdate < 60000)) {
                return; // Only update 'online' once per minute
            }

            try {
                sessionStorage.setItem('last_presence_update', now.toString());
                sessionStorage.setItem('last_presence_status', status);

                const { error } = await supabase
                    .from('app_users')
                    .update({
                        online_status: status,
                        last_activity_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) {
                    if (error.code !== 'PGRST116') console.warn('Presence update error:', error.message);
                }
            } catch (err) {
                // Ignore background errors
            }
        };

        const handleActivity = () => {
            clearTimeout(idleTimer);
            updateStatus('online');
            idleTimer = setTimeout(() => updateStatus('idle', true), IDLE_TIMEOUT);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                updateStatus('idle', true);
            } else {
                handleActivity();
            }
        };

        // Event listeners for activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        // Tab lifecycle listeners
        window.addEventListener('beforeunload', () => updateStatus('offline'));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial online status
        updateStatus('online');
        idleTimer = setTimeout(() => updateStatus('idle'), IDLE_TIMEOUT);

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            updateStatus('offline');
            clearTimeout(idleTimer);
        };
    }, []);

    return null; // This component doesn't render anything
};
