/**
 * Supabase Edge Function Service
 * Handles backend scraping and real-time updates
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
    try {
        // @ts-ignore
        const url = import.meta.env.VITE_SUPABASE_URL;
        // @ts-ignore
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!url || !key) {
            console.warn('[EdgeFn] Supabase credentials missing');
            return null;
        }
        
        return createClient(url, key);
    } catch (e) {
        console.warn('[EdgeFn] Could not initialize Supabase client');
        return null;
    }
};

export interface ContentMetrics {
    id?: string;
    content_id?: string;
    content_link: string;
    platform: string;
    username: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
    engagement_rate: number;
    engagement_count?: number;
    caption?: string;
    thumbnail_url?: string;
    last_scraped_at?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Call Supabase Edge Function to scrape Instagram data
 */
export const scrapeInstagramMetricsEdgeFn = async (
    contentLink: string,
    username: string
): Promise<ContentMetrics | null> => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('[EdgeFn] Supabase client not available');
        return null;
    }

    try {
        console.log('[EdgeFn] Calling scrape_instagram function:', { contentLink, username });

        // Call the Edge Function
        const { data, error } = await client.functions.invoke('scrape_instagram', {
            body: {
                content_link: contentLink,
                username: username
            }
        });

        if (error) {
            console.error('[EdgeFn] Error calling Edge Function:', error);
            return null;
        }

        console.log('[EdgeFn] Response from Edge Function:', data);

        if (data?.success && data?.metrics) {
            return data.metrics as ContentMetrics;
        }

        return null;
    } catch (error) {
        console.error('[EdgeFn] Exception calling Edge Function:', error);
        return null;
    }
};

/**
 * Save metrics to database
 */
export const saveMetricsToDatabase = async (metrics: ContentMetrics): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('[EdgeFn] Supabase client not available');
        return false;
    }

    try {
        console.log('[EdgeFn] Saving metrics to database:', metrics.content_link);

        const { data, error } = await client
            .from('content_metrics')
            .upsert(
                {
                    content_link: metrics.content_link,
                    platform: metrics.platform,
                    username: metrics.username,
                    views: metrics.views,
                    likes: metrics.likes,
                    comments: metrics.comments,
                    shares: metrics.shares,
                    saves: metrics.saves,
                    reach: metrics.reach,
                    impressions: metrics.impressions,
                    engagement_rate: metrics.engagement_rate,
                    caption: metrics.caption,
                    thumbnail_url: metrics.thumbnail_url,
                    last_scraped_at: new Date().toISOString()
                },
                { onConflict: 'content_link' }
            )
            .select();

        if (error) {
            console.error('[EdgeFn] Database error:', error);
            return false;
        }

        console.log('[EdgeFn] Metrics saved successfully');
        return true;
    } catch (error) {
        console.error('[EdgeFn] Exception saving metrics:', error);
        return false;
    }
};

/**
 * Subscribe to real-time metrics updates
 */
export const subscribeToMetricsUpdates = (
    contentLink: string,
    callback: (metrics: ContentMetrics) => void
) => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('[EdgeFn] Supabase client not available');
        return null;
    }

    try {
        console.log('[EdgeFn] Subscribing to real-time updates for:', contentLink);

        const subscription = client
            .from(`content_metrics:content_link=eq.${contentLink}`)
            .on('*', (payload) => {
                console.log('[EdgeFn] Real-time update received:', payload);
                if (payload.new) {
                    callback(payload.new as ContentMetrics);
                }
            })
            .subscribe();

        return subscription;
    } catch (error) {
        console.error('[EdgeFn] Exception subscribing to updates:', error);
        return null;
    }
};

/**
 * Get all metrics from database
 */
export const getMetricsFromDatabase = async (): Promise<ContentMetrics[]> => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('[EdgeFn] Supabase client not available');
        return [];
    }

    try {
        console.log('[EdgeFn] Fetching all metrics from database');

        const { data, error } = await client
            .from('content_metrics')
            .select('*')
            .order('last_scraped_at', { ascending: false });

        if (error) {
            console.error('[EdgeFn] Database error:', error);
            return [];
        }

        console.log('[EdgeFn] Fetched metrics:', data?.length || 0);
        return (data || []) as ContentMetrics[];
    } catch (error) {
        console.error('[EdgeFn] Exception fetching metrics:', error);
        return [];
    }
};

/**
 * Get metrics for specific content
 */
export const getMetricsForContent = async (contentLink: string): Promise<ContentMetrics | null> => {
    const client = getSupabaseClient();
    if (!client) {
        console.error('[EdgeFn] Supabase client not available');
        return null;
    }

    try {
        console.log('[EdgeFn] Fetching metrics for:', contentLink);

        const { data, error } = await client
            .from('content_metrics')
            .select('*')
            .eq('content_link', contentLink)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned
            console.error('[EdgeFn] Database error:', error);
        }

        return data as ContentMetrics | null;
    } catch (error) {
        console.error('[EdgeFn] Exception fetching metrics:', error);
        return null;
    }
};
