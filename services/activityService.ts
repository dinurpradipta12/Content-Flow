import { supabase } from './supabaseClient';

export type ActivityAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE_CONTENT'
    | 'UPDATE_CONTENT'
    | 'DELETE_CONTENT'
    | 'INVITE_USER'
    | 'VERIFY_USER'
    | 'UPDATE_PROFILE'
    | 'CHANGE_PASSWORD'
    | 'RENEWAL_REQUEST'
    | 'UPDATE_WORKSPACE'
    | 'UPDATE_CONFIG';

export interface ActivityLog {
    user_id?: string;
    workspace_id?: string;
    action: ActivityAction;
    entity_type?: string;
    entity_id?: string;
    details?: any;
}

export const logActivity = async (activity: ActivityLog) => {
    try {
        const userId = activity.user_id || localStorage.getItem('user_id');

        const { error } = await supabase.from('activity_logs').insert([{
            user_id: userId,
            workspace_id: activity.workspace_id || null,
            action: activity.action,
            entity_type: activity.entity_type,
            entity_id: activity.entity_id,
            details: activity.details,
            created_at: new Date().toISOString()
        }]);

        if (error) {
            console.error('Error logging activity:', error);
        }
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
};

export const fetchActivityLogs = async (workspaceId?: string | string[], limit = 50) => {
    try {
        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                actor:user_id(full_name, username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (workspaceId) {
            if (Array.isArray(workspaceId)) {
                query = query.in('workspace_id', workspaceId);
            } else {
                query = query.eq('workspace_id', workspaceId);
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error('fetchActivityLogs error:', error);
            return [];
        }

        // Enrich with workspace names separately (avoids FK join issues)
        if (data && data.length > 0) {
            const wsIds = [...new Set(data.map(d => d.workspace_id).filter(Boolean))];
            let wsMap: Record<string, string> = {};
            if (wsIds.length > 0) {
                const { data: wsData } = await supabase
                    .from('workspaces')
                    .select('id, name')
                    .in('id', wsIds);
                if (wsData) {
                    wsMap = Object.fromEntries(wsData.map(w => [w.id, w.name]));
                }
            }
            return data.map(log => ({
                ...log,
                workspace: log.workspace_id ? { name: wsMap[log.workspace_id] || 'Unknown' } : null
            }));
        }

        return data || [];
    } catch (err) {
        console.error('fetchActivityLogs exception:', err);
        return [];
    }
};
