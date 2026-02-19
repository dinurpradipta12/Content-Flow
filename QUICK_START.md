# 🚀 Quick Start - Real-Time Metrics Scraping

## What You're Getting
✅ Real-time Instagram metrics collection
✅ Automatic database persistence
✅ Live updates (no page refresh!)
✅ Complete metrics: views, likes, comments, reach, impressions, ER

---

## ⏱️ Setup Time: 5 minutes

### 1️⃣ Create Database (2 min)
```
Go to: Supabase Dashboard > SQL Editor > New Query
Copy: Full content of `/supabase_setup.sql`
Click: Run
```

### 2️⃣ Deploy Edge Function (2 min)
```
Go to: Supabase Dashboard > Edge Functions > Create Function
Name: scrape_instagram
Copy: Full content of `/supabase_edge_function_scrape_instagram.ts`
Click: Deploy
```

### 3️⃣ Add Secret (1 min)
```
Function Settings > Add Secret
Name: RAPIDAPI_KEY
Value: c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb
Save & Redeploy
```

---

## ✅ Verify It Works

1. Open app: `http://localhost:3000`
2. Go to: Content Data Insight
3. Click: "Analyze" button
4. Wait: 2-5 seconds
5. Check: Console has logs like:
   ```
   [EdgeFn] Calling scrape_instagram function
   [EdgeFn] Response from Edge Function
   [EdgeFn] Metrics saved successfully
   ```

---

## 📊 What Gets Saved

| Field | Value | Source |
|-------|-------|--------|
| views | 0 | API limitation |
| likes | ✅ | Instagram API |
| comments | ✅ | Instagram API |
| reach | ✅ | Calculated |
| impressions | ✅ | Calculated |
| engagement_rate | ✅ | Calculated |

---

## 🔍 Check Database

In Supabase SQL Editor:
```sql
SELECT * FROM content_metrics LIMIT 1;
```

Should show your metrics!

---

## 📚 Full Docs

- **Setup Guide**: `SUPABASE_EDGE_FUNCTION_SETUP.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

---

## 💡 How It Works

```
User clicks "Analyze"
         ↓
Supabase Edge Function
  - Scrapes Instagram
  - Calculates metrics
  - Saves to database
         ↓
Real-time update broadcast
         ↓
UI updates (no refresh!)
```

---

## 🆘 Help!

**Not working?**
1. Check Supabase Edge Function logs
2. Verify `RAPIDAPI_KEY` is set
3. Check RapidAPI subscription is active
4. Refresh browser and try again

**Still stuck?**
- See full guide: `SUPABASE_EDGE_FUNCTION_SETUP.md`
- Troubleshooting section has all common issues

---

**Status**: Ready to deploy! 🎉
