/**
 * Smart Sync Service
 * 
 * Menentukan strategi penyimpanan berdasarkan tipe workspace/user:
 * - Personal: Data di-cache di IndexedDB, sync ke Supabase jarang (hemat DB)
 * - Team: Full realtime sync ke Supabase (untuk kolaborasi)
 * 
 * Ini BUKAN menghapus Supabase untuk personal user,
 * tapi mengurangi frekuensi sync untuk menghemat DB usage.
 */

import { supabase } from './supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncMode = 'realtime' | 'lazy';

export interface SyncConfig {
    mode: SyncMode;
    realtimeEnabled: boolean;
    syncIntervalMs: number; // Interval sync ke Supabase (ms)
}

// ─── Configuration ───────────────────────────────────────────────────────────

const SYNC_CONFIGS: Record<SyncMode, SyncConfig> = {
    realtime: {
        mode: 'realtime',
        realtimeEnabled: true,
        syncIntervalMs: 0, // Langsung sync
    },
    lazy: {
        mode: 'lazy',
        realtimeEnabled: false,
        syncIntervalMs: 1000 * 60 * 30, // Sync setiap 30 menit
    },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Tentukan sync mode berdasarkan workspace type
 */
export const getSyncMode = (workspaceType?: string): SyncMode => {
    if (workspaceType === 'personal') return 'lazy';
    return 'realtime'; // Default: team = realtime
};

/**
 * Tentukan sync config berdasarkan workspace type
 */
export const getSyncConfig = (workspaceType?: string): SyncConfig => {
    return SYNC_CONFIGS[getSyncMode(workspaceType)];
};

/**
 * Cek apakah user saat ini adalah personal-only user
 * (semua workspace-nya bertipe personal)
 */
export const isPersonalOnlyUser = (): boolean => {
    const pkg = localStorage.getItem('user_subscription_package') || '';
    return pkg.toLowerCase().includes('personal') || pkg.toLowerCase() === 'free';
};

/**
 * Cek apakah realtime harus aktif untuk workspace tertentu
 */
export const shouldEnableRealtime = (workspaceType?: string): boolean => {
    return getSyncConfig(workspaceType).realtimeEnabled;
};

/**
 * Conditional Supabase channel — hanya subscribe jika workspace adalah team
 * Untuk personal workspace, return null (tidak subscribe)
 */
export const createConditionalChannel = (
    channelName: string,
    workspaceType?: string
) => {
    if (!shouldEnableRealtime(workspaceType)) {
        console.log(`[SmartSync] Skipping realtime channel "${channelName}" for personal workspace`);
        return null;
    }
    return supabase.channel(channelName);
};

/**
 * Safely remove a channel (handles null for personal workspaces)
 */
export const removeConditionalChannel = (channel: any) => {
    if (channel) {
        supabase.removeChannel(channel);
    }
};

// ─── IndexedDB Cache Layer ──────────────────────────────────────────────────

const DB_NAME = 'contentflow_cache';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            // Generic cache store — key: tableName_id, value: data
            if (!db.objectStoreNames.contains('cache')) {
                db.createObjectStore('cache', { keyPath: 'cacheKey' });
            }
            // Sync metadata — tracks last sync time per table
            if (!db.objectStoreNames.contains('sync_meta')) {
                db.createObjectStore('sync_meta', { keyPath: 'table' });
            }
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onerror = () => reject(request.error);
    });
};

/**
 * Save data to local cache (IndexedDB)
 */
export const cacheData = async (table: string, id: string, data: any): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction('cache', 'readwrite');
        const store = tx.objectStore('cache');
        store.put({ cacheKey: `${table}_${id}`, table, id, data, cachedAt: Date.now() });
    } catch (err) {
        console.warn('[SmartSync] Cache write failed:', err);
    }
};

/**
 * Read data from local cache
 */
export const getCachedData = async (table: string, id: string): Promise<any | null> => {
    try {
        const db = await openDB();
        const tx = db.transaction('cache', 'readonly');
        const store = tx.objectStore('cache');
        const request = store.get(`${table}_${id}`);
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
};

/**
 * Cache data batch (multiple rows for a table)
 */
export const cacheBatch = async (table: string, rows: any[]): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(['cache', 'sync_meta'], 'readwrite');
        const store = tx.objectStore('cache');
        const metaStore = tx.objectStore('sync_meta');

        rows.forEach(row => {
            if (row.id) {
                store.put({ cacheKey: `${table}_${row.id}`, table, id: row.id, data: row, cachedAt: Date.now() });
            }
        });

        // Update last sync time
        metaStore.put({ table, lastSync: Date.now() });
    } catch (err) {
        console.warn('[SmartSync] Batch cache failed:', err);
    }
};

/**
 * Get all cached data for a table
 */
export const getCachedTable = async (table: string): Promise<any[]> => {
    try {
        const db = await openDB();
        const tx = db.transaction('cache', 'readonly');
        const store = tx.objectStore('cache');
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const all = request.result || [];
                resolve(all.filter((r: any) => r.table === table).map((r: any) => r.data));
            };
            request.onerror = () => resolve([]);
        });
    } catch {
        return [];
    }
};

/**
 * Check if table needs sync (based on sync interval)
 */
export const needsSync = async (table: string, intervalMs: number): Promise<boolean> => {
    try {
        const db = await openDB();
        const tx = db.transaction('sync_meta', 'readonly');
        const store = tx.objectStore('sync_meta');
        const request = store.get(table);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const meta = request.result;
                if (!meta?.lastSync) return resolve(true);
                resolve(Date.now() - meta.lastSync > intervalMs);
            };
            request.onerror = () => resolve(true);
        });
    } catch {
        return true;
    }
};

/**
 * Smart fetch: Use cache for personal, direct Supabase for team
 *
 * Usage:
 * ```ts
 * const data = await smartFetch({
 *   table: 'content_items',
 *   workspaceType: workspace.workspace_type,
 *   query: () => supabase.from('content_items').select('*').eq('workspace_id', id),
 *   cacheKey: workspaceId
 * });
 * ```
 */
export const smartFetch = async <T = any>({
    table,
    workspaceType,
    query,
    cacheKey,
}: {
    table: string;
    workspaceType?: string;
    query: () => any; // Supabase query builder
    cacheKey?: string;
}): Promise<T[]> => {
    const config = getSyncConfig(workspaceType);
    const key = cacheKey || table;

    // Team mode: always fetch from Supabase directly
    if (config.mode === 'realtime') {
        const { data, error } = await query();
        if (error) throw error;
        return data || [];
    }

    // Personal/Lazy mode: check cache first
    const shouldRefresh = await needsSync(`${table}_${key}`, config.syncIntervalMs);

    if (!shouldRefresh) {
        const cached = await getCachedTable(`${table}_${key}`);
        if (cached.length > 0) {
            console.log(`[SmartSync] Using cached data for ${table} (${cached.length} rows)`);
            return cached as T[];
        }
    }

    // Cache expired or empty — fetch from Supabase
    console.log(`[SmartSync] Fetching fresh data for ${table} from Supabase`);
    const { data, error } = await query();
    if (error) throw error;

    // Cache the result
    if (data) {
        await cacheBatch(`${table}_${key}`, data);
    }

    return data || [];
};

/**
 * Smart write: Write to cache immediately, sync to Supabase lazily for personal
 */
export const smartWrite = async ({
    table,
    workspaceType,
    mutation,
    data,
}: {
    table: string;
    workspaceType?: string;
    mutation: () => any; // Supabase mutation
    data?: any;
}): Promise<any> => {
    const config = getSyncConfig(workspaceType);

    // Always write to Supabase (both personal and team)
    // The difference is team gets realtime notification, personal doesn't
    const result = await mutation();
    if (result.error) throw result.error;

    // Cache locally too (for personal, this serves as quick-read cache)
    if (data?.id) {
        await cacheData(table, data.id, data);
    }

    return result;
};
