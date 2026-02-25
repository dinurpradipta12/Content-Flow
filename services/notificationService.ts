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
        const { data: developers, error: devError } = await supabase
            .from('app_users')
            .select('id')
            .eq('role', 'Developer');

        if (devError) throw devError;
        if (!developers || developers.length === 0) return;

        const actorId = localStorage.getItem('user_id');

        const notifications = developers.map(dev => ({
            recipient_id: dev.id,
            actor_id: actorId,
            type: 'DEVELOPER_ALERT',
            title,
            content,
            metadata: {
                ...metadata,
                sound: 'special'
            }
        }));

        await supabase.from('notifications').insert(notifications);
    } catch (err) {
        console.error('Failed to notify developers:', err);
    }
};

export const notifyWorkspaceMembers = async ({
    workspaceId,
    title,
    content,
    type = 'INFO',
    metadata = {}
}: {
    workspaceId: string;
    title: string;
    content: string;
    type?: string;
    metadata?: any;
}) => {
    try {
        const actorId = localStorage.getItem('user_id');

        const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('members')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace) return;

        const { data: users, error: userError } = await supabase
            .from('app_users')
            .select('id')
            .in('username', workspace.members || []);

        if (userError || !users) return;

        const notifications = users
            .filter(u => u.id !== actorId)
            .map(u => ({
                recipient_id: u.id,
                actor_id: actorId,
                workspace_id: workspaceId,
                type,
                title,
                content,
                metadata
            }));

        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }
    } catch (err) {
        console.error('Failed to notify workspace members:', err);
    }
};

export const checkUpcomingContent = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const { data: users } = await supabase.from('app_users').select('username').eq('id', userId).single();
        if (!users) return;

        const { data: workspaces } = await supabase
            .from('workspaces')
            .select('id, name, members')
            .contains('members', [users.username]);

        if (!workspaces || workspaces.length === 0) return;

        for (const ws of workspaces) {
            const { data: contentItems } = await supabase
                .from('content_items')
                .select('*')
                .eq('workspace_id', ws.id)
                .eq('date', dateStr);

            if (!contentItems) continue;

            for (const item of contentItems) {
                const { data: existing } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('recipient_id', userId)
                    .eq('type', 'CONTENT_H1')
                    .filter('metadata->>content_id', 'eq', item.id)
                    .maybeSingle();

                if (!existing) {
                    await supabase.from('notifications').insert([{
                        recipient_id: userId,
                        type: 'CONTENT_H1',
                        workspace_id: ws.id,
                        title: 'Pengingat Upload Besok',
                        content: `Perhatian!, ada konten yang akan di upload besok dengan judul "${item.title}" dengan PIC ${item.pic || 'Belum ada assigned'}, harap memperhatikan konten agar sudah siap untuk di upload besok`,
                        metadata: {
                            content_id: item.id,
                            show_popup: true,
                            pic: item.pic
                        }
                    }]);
                }
            }
        }
    } catch (err) {
        console.error('Error checking upcoming content:', err);
    }
};
