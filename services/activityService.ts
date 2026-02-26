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
        const tenantId = activity.workspace_id || localStorage.getItem('tenant_id');

        const { error } = await supabase.from('activity_logs').insert([{
            user_id: userId,
            workspace_id: tenantId,
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

export const fetchActivityLogs = async (workspaceId?: string, limit = 50) => {
    let query = supabase
        .from('activity_logs')
        .select(`
            *,
            actor:app_users!user_id(full_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};
