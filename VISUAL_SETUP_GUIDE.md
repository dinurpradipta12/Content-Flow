# 🎯 Step-by-Step Visual Setup Guide

## Overview
This guide walks you through setting up real-time Instagram metrics scraping in **5 easy steps**.

---

## Step 1️⃣: Create Database Table (2 minutes)

### Navigate to Supabase
```
1. Open: https://supabase.com/dashboard
2. Select: Your project (Content-Flow)
3. Click: "SQL Editor" in left sidebar
```

### Create New Query
```
1. Click: "New Query" button
2. You'll see empty SQL editor
```

### Copy & Paste SQL
```
1. Open file: /supabase_setup.sql
2. Copy: All the code
3. Paste: Into Supabase SQL Editor
4. Click: "Run" button
```

### ✅ Result
You should see:
```
✓ Created table "content_metrics"
✓ Created 2 indexes
✓ Enabled RLS
```

---

## Step 2️⃣: Deploy Edge Function (2 minutes)

### Navigate to Edge Functions
```
1. Supabase Dashboard
2. Click: "Edge Functions" in left sidebar
3. Click: "Create Function" button
```

### Create New Function
```
Name field: Type "scrape_instagram"
Region: Leave as default
Click: "Create Function"
```

### Copy Edge Function Code
```
1. Open file: /supabase_edge_function_scrape_instagram.ts
2. Copy: All the code
3. Supabase editor: Select all (Cmd+A)
4. Paste: New code
```

### Deploy
```
1. Click: "Deploy" button (top right)
2. Wait: For "Function deployed successfully"
```

### ✅ Result
You should see:
```
✓ Function scrape_instagram deployed
✓ Function URL shown
✓ Logs tab available
```

---

## Step 3️⃣: Add API Secret (1 minute)

### Go to Function Settings
```
1. Edge Functions > scrape_instagram
2. Look for: Settings or gear icon
3. Click: Function Settings
```

### Add Secret
```
Create new secret:
- Field "Name": RAPIDAPI_KEY
- Field "Value": c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb

Click: "Save"
```

### Redeploy
```
1. Go back to function editor
2. Click: "Deploy" button again
3. Wait for deployment to complete
```

### ✅ Result
Secret is now stored securely:
```
✓ RAPIDAPI_KEY added
✓ Function redeployed
✓ Secret available to Edge Function
```

---

## Step 4️⃣: Test the Setup (1 minute)

### Open App
```
Go to: http://localhost:3000
Navigate to: Content Data Insight page
```

### Click Analyze
```
1. Find any Instagram content row
2. Click: "Analyze" button
3. Wait: 2-5 seconds
```

### Check Console
```
1. Open: Browser DevTools (F12)
2. Go to: Console tab
3. Look for logs starting with "[EdgeFn]":
   - [EdgeFn] Calling scrape_instagram function
   - [EdgeFn] Response from Edge Function
   - [EdgeFn] Metrics saved successfully
```

### ✅ Result
Metrics appear in the table:
```
✓ Likes: 271,180
✓ Comments: 2,540
✓ Reach: calculated
✓ ER: calculated
✓ Views: N/A (API limitation)
```

---

## Step 5️⃣: Verify Real-Time (Optional)

### Test Real-Time Update
```
1. Open same content in TWO browser tabs
2. Click "Analyze" in first tab
3. Watch SECOND tab update automatically
   (No refresh needed!)
```

### Check Database
```
Supabase Dashboard > SQL Editor > New Query

SELECT COUNT(*) FROM content_metrics;
SELECT * FROM content_metrics LIMIT 1;

Should show your scraped data!
```

### ✅ Result
Real-time system working:
```
✓ Instant updates across tabs
✓ Data persisted in database
✓ Timestamps auto-updated
```

---

## Troubleshooting

### ❌ "RAPIDAPI_KEY not configured"
```
Solution:
1. Edge Functions > scrape_instagram > Settings
2. Add secret RAPIDAPI_KEY with value
3. Redeploy function
```

### ❌ No metrics appearing
```
Solution:
1. Check browser console for errors
2. Check Edge Function logs (Logs tab)
3. Verify Instagram account is public
4. Try different Instagram post
```

### ❌ Real-time not updating
```
Solution:
1. Refresh browser page
2. Check WebSocket connection (DevTools Network)
3. Verify Supabase project is online
```

---

## Success Checklist

- [ ] Supabase table created (`content_metrics`)
- [ ] Edge Function deployed (`scrape_instagram`)
- [ ] Secret added (`RAPIDAPI_KEY`)
- [ ] App opens without errors
- [ ] "Analyze" button works
- [ ] Metrics appear in table within 5 seconds
- [ ] Console shows "[EdgeFn]" logs
- [ ] Database has saved metrics
- [ ] Real-time update works (optional)

---

## Next Steps

After verification:

1. **Monitor**: Check Edge Function logs regularly
2. **Optimize**: Adjust rate limiting if needed
3. **Expand**: Add more Instagram accounts
4. **Automate**: Set up scheduled scraping
5. **Analyze**: Build dashboard with metrics

---

## Files Reference

| What | Where |
|------|-------|
| SQL setup | `/supabase_setup.sql` |
| Edge Function code | `/supabase_edge_function_scrape_instagram.ts` |
| Frontend service | `/services/supabaseEdgeFunctionService.ts` |
| Component using it | `/pages/ContentDataInsight.tsx` |
| Full docs | `/SUPABASE_EDGE_FUNCTION_SETUP.md` |
| Quick reference | `/QUICK_START.md` |

---

## Support

If you get stuck:
1. Check the error logs carefully
2. Read `SUPABASE_EDGE_FUNCTION_SETUP.md` troubleshooting section
3. Review `DEPLOYMENT_CHECKLIST.md`
4. Check Supabase status page

---

## Time Estimates

| Step | Time | Status |
|------|------|--------|
| Step 1: Database | 2 min | ✅ Easy |
| Step 2: Edge Function | 2 min | ✅ Easy |
| Step 3: Secret | 1 min | ✅ Easy |
| Step 4: Test | 1 min | ✅ Easy |
| Step 5: Real-Time | 1 min | ✅ Optional |
| **TOTAL** | **~5 min** | **Ready!** |

---

## 🎉 Congratulations!

You now have a **production-ready real-time metrics system**!

Start using it:
```
1. Open app
2. Go to Content Data Insight
3. Click "Analyze"
4. Watch metrics appear in real-time!
```

---

**Good luck! 🚀**
