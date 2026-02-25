import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const UserPresence = () => {
    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        let idleTimer: NodeJS.Timeout;
        const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

        const updateStatus = async (status: 'online' | 'idle' | 'offline') => {
            try {
                const { error } = await supabase
                    .from('app_users')
                    .update({
                        online_status: status,
                        last_activity_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) {
                    // Fail silently or handle rate limits
                    if (error.code !== 'PGRST116') console.warn('Presence update error:', error.message);
                }
            } catch (err) {
                // Ignore background errors
            }
        };

        const handleActivity = () => {
            clearTimeout(idleTimer);
            updateStatus('online');
            idleTimer = setTimeout(() => updateStatus('idle'), IDLE_TIMEOUT);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                updateStatus('idle'); // When tab is hidden, mark as idle instead of offline immediately
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
