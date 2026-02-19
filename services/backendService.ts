/**
 * Backend Service - Calls local Node.js Express backend
 * This avoids Edge Function deployment issues and CORS problems
 */

import { supabase } from './supabaseClient';

export interface ContentMetrics {
  id?: string;
  content_id?: string;
  content_link?: string;
  platform?: string;
  username: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement_rate: number | string;
  caption: string;
  thumbnail_url: string | null;
  last_scraped_at?: string;
  created_at?: string;
  updated_at?: string;
}

const BACKEND_URL = 'http://localhost:3001';

/**
 * Scrape Instagram metrics using local backend
 */
export async function scrapeInstagramMetricsBackend(
  contentLink: string,
  username: string
): Promise<ContentMetrics> {
  console.log('[BackendService] Calling local backend for:', { contentLink, username });

  try {
    const response = await fetch(`${BACKEND_URL}/api/scrape-instagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const result = await response.json();
    console.log('[BackendService] Response received:', result);

    if (!result.success) {
      throw new Error(result.error || 'Scraping failed');
    }

    const metrics: ContentMetrics = {
      ...result.data,
      content_link: contentLink,
      platform: 'instagram',
      last_scraped_at: new Date().toISOString()
    };

    console.log('[BackendService] Metrics extracted:', metrics);
    return metrics;

  } catch (error) {
    console.error('[BackendService] Error:', error);
    throw new Error(`Failed to scrape metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save metrics to Supabase database
 */
export async function saveMetricsToDatabase(metrics: ContentMetrics): Promise<boolean> {
  try {
    console.log('[BackendService] Saving metrics to database:', metrics);

    const { data, error } = await supabase
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
          last_scraped_at: metrics.last_scraped_at
        },
        { onConflict: 'content_link' }
      );

    if (error) {
      throw error;
    }

    console.log('[BackendService] Metrics saved successfully');
    return true;

  } catch (error) {
    console.error('[BackendService] Error saving to database:', error);
    return false;
  }
}

/**
 * Subscribe to real-time metrics updates
 */
export function subscribeToMetricsUpdates(
  contentLink: string,
  callback: (metrics: ContentMetrics) => void
): { unsubscribe: () => void } {
  console.log('[BackendService] Setting up real-time subscription for:', contentLink);

  const subscription = supabase
    .channel(`metrics:${contentLink}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'content_metrics',
        filter: `content_link=eq.${contentLink}`
      },
      (payload: any) => {
        console.log('[BackendService] Real-time update received:', payload.new);
        callback(payload.new as ContentMetrics);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      console.log('[BackendService] Unsubscribing from real-time updates');
      subscription.unsubscribe();
    }
  };
}

/**
 * Get saved metrics from database
 */
export async function getMetricsForContent(contentLink: string): Promise<ContentMetrics | null> {
  try {
    const { data, error } = await supabase
      .from('content_metrics')
      .select('*')
      .eq('content_link', contentLink)
      .single();

    if (error) {
      console.warn('[BackendService] No saved metrics found:', error);
      return null;
    }

    return data as ContentMetrics;

  } catch (error) {
    console.error('[BackendService] Error fetching metrics:', error);
    return null;
  }
}

/**
 * Get all metrics from database
 */
export async function getMetricsFromDatabase(): Promise<ContentMetrics[]> {
  try {
    const { data, error } = await supabase
      .from('content_metrics')
      .select('*');

    if (error) {
      throw error;
    }

    return data as ContentMetrics[];

  } catch (error) {
    console.error('[BackendService] Error fetching metrics:', error);
    return [];
  }
}
