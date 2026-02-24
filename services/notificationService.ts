import { supabase } from './supabaseClient';

export const notifyDevelopers = async ({
    title,
    content,
    metadata = {}
}: {
    title: string;
    content: string;
    metadata?: any;
}) => {
    try {
        // 1. Get all developers
        const { data: developers, error: devError } = await supabase
            .from('app_users')
            .select('id')
            .eq('role', 'Developer');

        if (devError) throw devError;
        if (!developers || developers.length === 0) return;

        const actorId = localStorage.getItem('user_id');

        // 2. Prepare notifications for each developer
        const notifications = developers.map(dev => ({
            recipient_id: dev.id,
            actor_id: actorId, // The person who triggered the registration/renewal
            type: 'DEVELOPER_ALERT',
            title,
            content,
            metadata: {
                ...metadata,
                sound: 'special' // Essential for unique sound trigger
            }
        }));

        // 3. Batch insert notifications
        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (insertError) throw insertError;
    } catch (err) {
        console.error('Failed to notify developers:', err);
    }
};
