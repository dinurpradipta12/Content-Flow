# Supabase Edge Function Setup Guide

## Overview
This guide walks you through setting up real-time Instagram metrics scraping using Supabase Edge Functions.

## Prerequisites
- Supabase account (already using it for the app database)
- RapidAPI subscription with Instagram endpoint access
- Supabase project URL and API keys (already configured)

---

## Step 1: Create Database Table

Go to your Supabase project dashboard:
1. Click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the entire content from `/Users/dinurm.pradipta/Content-Flow/supabase_setup.sql`
4. Click **Run** to create the `content_metrics` table

**Expected Result:**
- ✅ Table `content_metrics` created
- ✅ Indexes created for performance
- ✅ RLS policies enabled
- ✅ Trigger for `updated_at` timestamp

---

## Step 2: Deploy Edge Function

The Edge Function runs server-side and scrapes Instagram data securely.

### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **Edge Functions** in the left sidebar
3. Click **Create Function**
4. Name it: `scrape_instagram`
5. Copy and paste the entire content from:
   `/Users/dinurm.pradipta/Content-Flow/supabase_edge_function_scrape_instagram.ts`
6. Click **Deploy**

### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Create the function directory
mkdir -p supabase/functions/scrape_instagram

# Copy the Edge Function file
cp supabase_edge_function_scrape_instagram.ts supabase/functions/scrape_instagram/index.ts

# Deploy
supabase functions deploy scrape_instagram
```

---

## Step 3: Configure Environment Variables

After deploying the Edge Function, add the RapidAPI key:

1. Go to **Edge Functions** > **scrape_instagram**
2. Click the **...** menu and select **Function Settings**
3. Add a new secret variable:
   - **Name:** `RAPIDAPI_KEY`
   - **Value:** `c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb`
4. Click **Save**

**Note:** The Edge Function has access to `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically.

---

## Step 4: Test the Edge Function

### Via cURL:
```bash
curl -X POST https://YOUR_PROJECT_ID.functions.supabase.co/scrape_instagram \
  -H "Content-Type: application/json" \
  -d '{
    "content_link": "https://www.instagram.com/reel/DU8PfKdk7YC/",
    "username": "dinurpradipta"
  }'
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

### Expected Response:
```json
{
  "success": true,
  "message": "Metrics scraped and saved successfully",
  "metrics": {
    "content_link": "https://www.instagram.com/reel/DU8PfKdk7YC/",
    "platform": "Instagram",
    "username": "dinurpradipta",
    "views": 0,
    "likes": 271180,
    "comments": 2540,
    "shares": 0,
    "saves": 0,
    "reach": 0,
    "impressions": 0,
    "engagement_rate": 0.95,
    "last_scraped_at": "2026-02-20T04:15:00.000Z"
  }
}
```

---

## Step 5: Enable Real-Time Subscriptions

Real-time updates happen automatically through:

1. **Supabase Realtime** - Frontend subscribes to `content_metrics` table changes
2. **PostgreSQL Triggers** - Automatically update `updated_at` timestamp
3. **Push Notifications** - Changes broadcast to all connected clients

No additional configuration needed! The app automatically subscribes when analyzing content.

---

## Metrics Collected

The Edge Function collects:
- ✅ **views** - Post view count (Note: Instagram API may return 0)
- ✅ **likes** - Total likes
- ✅ **comments** - Total comments
- ✅ **shares** - Share count
- ✅ **saves** - Number of saves
- ✅ **reach** - Estimated reach (75% of views)
- ✅ **impressions** - Estimated impressions (= views)
- ✅ **engagement_rate** - (Likes + Comments + Shares) / Views * 100

---

## How It Works

### Flow Diagram:
```
User clicks "Analyze" button
    ↓
Frontend calls Edge Function
    ↓
Edge Function scrapes Instagram via RapidAPI
    ↓
Calculates engagement metrics (reach, ER, impressions)
    ↓
Saves to Supabase `content_metrics` table
    ↓
Real-time subscription broadcasts to frontend
    ↓
Frontend displays updated metrics
```

---

## Troubleshooting

### Issue: Edge Function returns 404
**Solution:** Check if function is deployed correctly:
1. Go to Supabase dashboard → Edge Functions
2. Verify `scrape_instagram` function exists and is enabled
3. Check the function logs for errors

### Issue: "RAPIDAPI_KEY not configured" error
**Solution:** 
1. Go to Edge Function settings
2. Add the `RAPIDAPI_KEY` secret (see Step 3)
3. Redeploy the function: Click **Deploy** in the code editor

### Issue: Metrics showing 0 for all fields
**Solution:**
1. Check RapidAPI subscription status
2. Verify the Instagram account has public posts
3. Check Edge Function logs for API errors

### Issue: Real-time updates not working
**Solution:**
1. Check browser console for Supabase connection errors
2. Verify RLS policies are correctly set (see supabase_setup.sql)
3. Try manually refreshing the page

---

## Performance Optimization

The system is optimized for:
- **Multiple concurrent requests** - Edge Functions auto-scale
- **Large-scale scraping** - Batch processing with database queuing
- **Network efficiency** - Only store changed metrics
- **User experience** - Real-time updates with no page refresh

---

## Next Steps

### 1. Schedule Periodic Updates
Create a Supabase Cron Job (if available in your plan):
```sql
-- Example: Refresh metrics every hour
SELECT cron.schedule(
  'refresh_metrics_hourly',
  '0 * * * *',
  $$SELECT scrape_instagram()$$
);
```

### 2. Add Webhook Notifications
Set up webhooks to notify when metrics change significantly:
- Alert when engagement rate drops
- Notify on viral posts
- Weekly performance digest

### 3. Analytics Dashboard
Build analytics using the collected data:
- Growth trends
- Best performing content
- Audience insights

---

## Security

- ✅ RapidAPI key stored securely in Edge Function secrets
- ✅ Database accessed with service role (admin) from Edge Function
- ✅ Frontend uses anon key (read-only for metrics)
- ✅ RLS policies prevent unauthorized access
- ✅ CORS enabled only for your domain

---

## Support

For issues:
1. Check Supabase Edge Function logs
2. Review RapidAPI quota and status
3. Check browser console for frontend errors
4. Verify database connection in Supabase SQL Editor

---

## File Locations

- Database setup SQL: `/supabase_setup.sql`
- Edge Function code: `/supabase_edge_function_scrape_instagram.ts`
- Frontend service: `/services/supabaseEdgeFunctionService.ts`
- Component using it: `/pages/ContentDataInsight.tsx`
