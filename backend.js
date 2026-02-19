/**
 * Simple Express server for Instagram metrics scraping
 * Run with: node backend.js
 * Server runs on http://localhost:3001
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Instagram metrics scraping endpoint
app.post('/api/scrape-instagram', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required' 
      });
    }

    console.log(`[Instagram Scraper] Fetching metrics for: ${username}`);

    const rapidapiKey = process.env.RAPIDAPI_KEY;
    if (!rapidapiKey) {
      return res.status(500).json({
        success: false,
        error: 'RAPIDAPI_KEY environment variable not set'
      });
    }

    // Call Instagram API
    const response = await fetch(
      'https://instagram120.p.rapidapi.com/api/instagram/posts',
      {
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
      }
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Instagram Scraper] Response status: ${response.status}`);

    // Parse response - handle edges array structure
    let metrics = {
      username: username,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      impressions: 0,
      engagement_rate: 0,
      caption: 'N/A',
      thumbnail_url: null
    };

    // Extract first post metrics
    if (data.edges && Array.isArray(data.edges) && data.edges.length > 0) {
      const firstPost = data.edges[0].node;

      metrics = {
        username: username,
        views: firstPost.video_view_count || 0,
        likes: firstPost.media?.like_count || 0,
        comments: firstPost.media?.comment_count || 0,
        shares: firstPost.media?.shares || 0,
        saves: firstPost.media?.saves || 0,
        reach: (firstPost.video_view_count || 0) * 0.75,
        impressions: firstPost.video_view_count || 0,
        engagement_rate: firstPost.media ? 
          ((firstPost.media.like_count + firstPost.media.comment_count + (firstPost.media.shares || 0)) / 
           (firstPost.video_view_count || 1) * 100).toFixed(2) : 0,
        caption: firstPost.media?.caption || 'N/A',
        thumbnail_url: firstPost.media?.display_url || null
      };

      console.log(`[Instagram Scraper] Extracted metrics:`, {
        likes: metrics.likes,
        comments: metrics.comments,
        views: metrics.views
      });
    }

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Instagram Scraper] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Instagram Scraper Backend running on http://localhost:${PORT}`);
  console.log(`📊 POST http://localhost:${PORT}/api/scrape-instagram`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
  console.log('Environment:');
  console.log(`  - RAPIDAPI_KEY: ${process.env.RAPIDAPI_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`  - Node version: ${process.version}\n`);
});
