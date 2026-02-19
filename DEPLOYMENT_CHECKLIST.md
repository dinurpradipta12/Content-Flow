# Supabase Edge Function - Deployment Checklist

## ✅ Quick Setup (5-10 minutes)

Follow these steps in order:

### 1️⃣ Create Database Table
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Create new query
- [ ] Copy content from `supabase_setup.sql`
- [ ] Run query
- [ ] Verify table `content_metrics` is created
- [ ] Check indexes are created

### 2️⃣ Deploy Edge Function
- [ ] Open Supabase Dashboard
- [ ] Go to Edge Functions
- [ ] Click "Create Function"
- [ ] Name it: `scrape_instagram`
- [ ] Copy code from `supabase_edge_function_scrape_instagram.ts`
- [ ] Paste into editor
- [ ] Click "Deploy"
- [ ] Wait for "Function deployed successfully"

### 3️⃣ Configure Secrets
- [ ] Open Edge Function settings (`scrape_instagram`)
- [ ] Click "Edit Function Settings"
- [ ] Add secret:
  - **Name:** `RAPIDAPI_KEY`
  - **Value:** `c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb`
- [ ] Click "Save"
- [ ] Redeploy function (click Deploy button again)

### 4️⃣ Test Edge Function
- [ ] Go to Function Details
- [ ] Copy the Function URL
- [ ] Test with cURL or Postman:

```bash
curl -X POST https://[PROJECT_ID].functions.supabase.co/scrape_instagram \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{
    "content_link": "https://www.instagram.com/reel/DU8PfKdk7YC/",
    "username": "dinurpradipta"
  }'
```

- [ ] Verify response includes metrics with `views`, `likes`, `comments`

### 5️⃣ Restart Dev Server
- [ ] Stop dev server (Ctrl+C)
- [ ] Run: `npm run dev`
- [ ] Navigate to Content Data Insight page
- [ ] Click "Analyze" button on any content

### 6️⃣ Verify Real-Time Updates
- [ ] Check browser console for logs:
  - `[EdgeFn] Calling scrape_instagram function`
  - `[EdgeFn] Response from Edge Function`
  - `[EdgeFn] Metrics saved successfully`
- [ ] Metrics should appear in the table
- [ ] Try editing metrics in another browser tab
- [ ] Verify real-time update (no page refresh needed)

---

## 🔍 Verification Steps

### Database Table
Check SQL Editor:
```sql
SELECT COUNT(*) FROM content_metrics;
```
Should return: `(1 row)`

### Edge Function
Check logs:
1. Go to Edge Function > scrape_instagram
2. Click "Logs" tab
3. Should show recent invocations

### Real-Time Subscription
Check browser DevTools:
1. Open Dev Tools (F12)
2. Go to Application > Storage > Cookies
3. Look for `sb-*` (Supabase session)
4. Check Console for `[EdgeFn]` logs

---

## 🐛 Common Issues & Solutions

### Issue: "RAPIDAPI_KEY not configured"
```
Solution:
1. Go to Edge Functions > scrape_instagram > Settings
2. Add secret RAPIDAPI_KEY
3. Redeploy function
```

### Issue: "Failed to fetch Instagram metrics"
```
Solution:
1. Check RapidAPI subscription is active
2. Verify Instagram account is public
3. Check Edge Function logs for API errors
```

### Issue: "Metrics show 0 for views"
```
Solution:
This is expected - Instagram API doesn't provide view counts
Likes and comments should show correct values
```

### Issue: Real-time updates not working
```
Solution:
1. Check browser console for Supabase errors
2. Verify RLS policies in database
3. Refresh page and try again
4. Check Supabase project status page
```

---

## 📊 Expected Results

### Console Logs (After clicking Analyze)
```
[ContentDataInsight] Analyze button clicked
[EdgeFn] Calling scrape_instagram function
[EdgeFn] Response from Edge Function
[EdgeFn] Metrics saved successfully
[EdgeFn] Subscribing to real-time updates
```

### Metrics Table Display
```
Platform  | Views | Likes  | Comments | Engagement Rate
-----------|-------|--------|----------|----------------
Instagram  | N/A   | 271,180| 2,540   | 0.95%
```

### Database Entry
In SQL Editor:
```sql
SELECT * FROM content_metrics 
WHERE platform = 'Instagram' 
ORDER BY last_scraped_at DESC 
LIMIT 1;
```

Should return a row with all metrics populated.

---

## 🚀 Next Steps After Verification

### Automated Scheduling
Create a scheduled job to scrape metrics daily:
```sql
-- Schedule daily at 8 AM UTC
SELECT cron.schedule(
  'daily_scrape',
  '0 8 * * *',
  'SELECT scrape_instagram()'
);
```

### Monitoring Dashboard
Create a view for analytics:
```sql
CREATE VIEW content_performance AS
SELECT 
  platform,
  COUNT(*) as total_posts,
  AVG(engagement_rate) as avg_engagement,
  SUM(likes) as total_likes,
  MAX(views) as peak_views
FROM content_metrics
GROUP BY platform;
```

### Alerts Setup
Configure Supabase alerts for:
- Failed function invocations
- High database latency
- High error rates

---

## 📞 Support Resources

1. **Supabase Docs**: https://supabase.com/docs
2. **Edge Functions Guide**: https://supabase.com/docs/guides/functions
3. **RapidAPI Status**: Check your subscription status
4. **Browser DevTools**: Use to debug real-time issues

---

## ✨ Features Available

Once set up, you'll have:
- ✅ Real-time metrics scraping
- ✅ Automatic database persistence
- ✅ Live updates (no page refresh needed)
- ✅ Complete metrics: views, likes, comments, reach, impressions, ER
- ✅ Historical data tracking
- ✅ Engagement calculations

---

## 📝 Notes

- Supabase Edge Functions are **serverless** - no infrastructure management needed
- Functions scale automatically based on demand
- Data is encrypted in transit and at rest
- RLS policies ensure only authorized access
- Real-time updates use WebSocket (low latency)

---

**Status:** Ready for deployment ✅
**Estimated Time:** 5-10 minutes
**Difficulty Level:** Easy (copy-paste)

Good luck! 🎉
