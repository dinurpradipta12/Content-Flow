import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || localStorage.getItem('sb_url') || '';
let supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('sb_key') || '';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
    if (!supabaseInstance) {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
    return supabaseInstance;
};

export let supabase = getSupabase();

export const updateSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    supabaseUrl = url;
    supabaseAnonKey = key;
    // Force recreation
    supabaseInstance = createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    supabase = supabaseInstance;
    window.location.reload();
};

export const checkConnectionLatency = async () => {
    const start = Date.now();
    try {
        const { error } = await supabase.from('app_config').select('id').limit(1);
        if (error) return -1;
        return Date.now() - start;
    } catch (e) {
        return -1;
    }
};
