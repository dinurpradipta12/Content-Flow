// Supabase Edge Function: scrape_instagram
// Deploy to: Supabase Project > Edge Functions > scrape_instagram

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

// Type definitions
interface ScrapedMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform: string;
  username: string;
  caption?: string;
  thumbnail?: string;
}

interface ResponseMetrics {
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
  caption?: string;
  thumbnail_url?: string;
  last_scraped_at: string;
}

// Extract username from Instagram URL
const extractUsername = (url: string): string => {
  try {
    const instagramMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/)
    if (instagramMatch) return instagramMatch[1]
    return 'unknown'
  } catch (e) {
    return 'unknown'
  }
}

// Call Instagram RapidAPI
const fetchInstagramMetrics = async (username: string, rapidapiKey: string): Promise<ScrapedMetrics | null> => {
  try {
    const apiUrl = 'https://instagram120.p.rapidapi.com/api/instagram/posts'
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': rapidapiKey,
        'x-rapidapi-host': 'instagram120.p.rapidapi.com'
      },
      body: JSON.stringify({
        username: username,
        maxId: ''
      })
    })

    if (!response.ok) {
      console.error(`[Edge Fn] API Error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const result = data.result || data.data || data
    let media = result

    // Handle paginated response
    if (result.edges && Array.isArray(result.edges) && result.edges.length > 0) {
      media = result.edges[0].node || result.edges[0]
    } else if (Array.isArray(result)) {
      media = result[0] || {}
    }

    const views = media.view_count || media.video_view_count || media.views || 0
    const likes = media.like_count || 0
    const comments = media.comment_count || 0

    return {
      platform: 'Instagram',
      username: media.owner?.username || username,
      views: views || 0,
      likes: likes || 0,
      comments: comments || 0,
      shares: media.shares || 0,
      saves: media.saves || 0,
      caption: media.caption?.text || media.caption || '',
      thumbnail: media.thumbnail_url || media.display_url || ''
    }
  } catch (error) {
    console.error('[Edge Fn] Error fetching Instagram metrics:', error)
    return null
  }
}

// Calculate engagement rate and reach estimates
const calculateEngagementMetrics = (metrics: ScrapedMetrics): { engagement_rate: number; reach: number; impressions: number } => {
  const totalEngagement = metrics.likes + metrics.comments + metrics.shares
  const engagement_rate = metrics.views > 0 ? (totalEngagement / metrics.views) * 100 : 0
  
  // Estimate reach (usually 70-80% of impressions for Instagram)
  const reach = Math.round(metrics.views * 0.75)
  // Impressions typically = views for video/reels
  const impressions = metrics.views

  return { engagement_rate: parseFloat(engagement_rate.toFixed(2)), reach, impressions }
}

// Main handler
serve(async (req) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  try {
    const { content_link, username } = await req.json()

    if (!content_link || !username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing content_link or username' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Edge Fn] Processing:', { content_link, username })

    // Get RapidAPI key from environment
    const rapidapiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!rapidapiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RAPIDAPI_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch metrics from Instagram API
    const scrapedMetrics = await fetchInstagramMetrics(username, rapidapiKey)
    if (!scrapedMetrics) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch Instagram metrics' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Calculate additional metrics
    const { engagement_rate, reach, impressions } = calculateEngagementMetrics(scrapedMetrics)

    // Prepare response
    const responseMetrics: ResponseMetrics = {
      content_link,
      platform: scrapedMetrics.platform,
      username: scrapedMetrics.username,
      views: scrapedMetrics.views,
      likes: scrapedMetrics.likes,
      comments: scrapedMetrics.comments,
      shares: scrapedMetrics.shares,
      saves: scrapedMetrics.saves,
      reach,
      impressions,
      engagement_rate,
      caption: scrapedMetrics.caption,
      thumbnail_url: scrapedMetrics.thumbnail,
      last_scraped_at: new Date().toISOString()
    }

    // Save to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const { error: dbError } = await supabase
      .from('content_metrics')
      .upsert(responseMetrics, { onConflict: 'content_link' })

    if (dbError) {
      console.error('[Edge Fn] Database error:', dbError)
      // Still return success if metrics were calculated, even if DB save fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Metrics scraped and saved successfully',
        metrics: responseMetrics
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('[Edge Fn] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
