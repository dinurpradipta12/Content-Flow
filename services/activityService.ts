// Activity Service - DISABLED
// Activity logs feature has been removed to reduce Supabase database usage.
// All functions are kept as no-ops to avoid breaking existing callers.

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
    | 'UPDATE_CONFIG'
    | 'REGISTER'
    | 'BYPASS_LOGIN';

export interface ActivityLog {
    user_id?: string;
    workspace_id?: string;
    action: ActivityAction;
    entity_type?: string;
    entity_id?: string;
    details?: any;
}

// No-op: does nothing, returns silently
export const logActivity = async (_activity: ActivityLog): Promise<void> => {
    return;
};

// No-op: returns empty array
export const fetchActivityLogs = async (_workspaceId?: string | string[], _limit = 50): Promise<any[]> => {
    return [];
};
