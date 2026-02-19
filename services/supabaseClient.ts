import { createClient } from '@supabase/supabase-js';

// Prioritize LocalStorage for runtime configuration (User Input)
const storedUrl = localStorage.getItem('sb_url');
const storedKey = localStorage.getItem('sb_key');

// Default fallbacks from project configuration to ensure it works immediately
const DEFAULT_URL = 'https://reqomleljyfujkivesxp.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcW9tbGVsanlmdWpraXZlc3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDAzNTEsImV4cCI6MjA4NzAxNjM1MX0.kssegIPnTXBfaaHV199T5uox8Qz5Z0rziTBhJ7L_ko4';

// Explicitly access Vite env vars safely
let envUrl = '';
let envKey = '';

try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        envUrl = import.meta.env.VITE_SUPABASE_URL;
        // @ts-ignore
        envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
} catch (e) {
    console.warn("Vite environment variables are not accessible.");
}

const supabaseUrl = storedUrl || envUrl || DEFAULT_URL;
const supabaseAnonKey = storedKey || envKey || DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Key missing. Please configure them in the Login settings.");
}

// Initialize Supabase Client
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);

// Helper to check if configured
export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
};

// Helper to update client config at runtime
export const updateSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    window.location.reload(); 
};

// Helper to check connection latency
export const checkConnectionLatency = async (): Promise<number> => {
    const start = performance.now();
    try {
        // Simple head request to check round-trip time
        // Using a lightweight query
        await supabase.from('workspaces').select('id').limit(1);
        const end = performance.now();
        return end - start;
    } catch (error) {
        // If error (e.g., auth fail), we still measure the round trip of the error response
        // But if network error, it will throw
        const end = performance.now();
        // If offline, return -1
        if (!navigator.onLine) return -1;
        return end - start;
    }
};