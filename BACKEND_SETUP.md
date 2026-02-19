# 🚀 Backend Setup Guide (Quick Fix for CORS Issues)

## Problem
The Supabase Edge Function approach has CORS issues and requires manual deployment.

## Solution
Use a local Node.js Express backend to handle Instagram scraping without CORS problems.

---

## ⚡ Quick Setup (2 minutes)

### Step 1: Install Dependencies
```bash
cd /Users/dinurm.pradipta/Content-Flow
npm install
```

### Step 2: Set Environment Variable
```bash
export RAPIDAPI_KEY=c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb
```

Or add to `.env`:
```
RAPIDAPI_KEY=c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb
```

### Step 3: Start Backend Server
In a **NEW terminal**:
```bash
cd /Users/dinurm.pradipta/Content-Flow
node backend.js
```

You should see:
```
🚀 Instagram Scraper Backend running on http://localhost:3001
📊 POST http://localhost:3001/api/scrape-instagram
💚 Health check: http://localhost:3001/health

Environment:
  - RAPIDAPI_KEY: ✅ Set
  - Node version: v18...
```

### Step 4: Keep Frontend Running
In another terminal (or existing one):
```bash
cd /Users/dinurm.pradipta/Content-Flow
npm run dev
```

Frontend runs on: `http://localhost:3000`
Backend runs on: `http://localhost:3001`

### Step 5: Test It
1. Open http://localhost:3000
2. Go to "Content Data Insight"
3. Click "Analyze" on any content
4. Watch metrics appear! ✅

---

## 📊 How It Works

```
Frontend (http://localhost:3000)
    ↓
    └→ Calls backend.js (http://localhost:3001/api/scrape-instagram)
        ↓
        └→ Calls RapidAPI Instagram endpoint
            ↓
            └→ Returns metrics to frontend
                ↓
                └→ Displays in table + saves to Supabase
```

---

## ✅ Expected Output

### In Frontend Console:
```
[BackendService] Calling local backend for: {contentLink: '...', username: 'reel'}
[BackendService] Response received: {success: true, data: {...}}
[BackendService] Metrics extracted: {username: 'reel', likes: 271180, comments: 2540, ...}
```

### In Backend Terminal:
```
[Instagram Scraper] Fetching metrics for: reel
[Instagram Scraper] Response status: 200
[Instagram Scraper] Extracted metrics: {likes: 271180, comments: 2540, views: 0}
[Instagram Scraper] Response received by frontend ✅
```

---

## 🔧 Troubleshooting

### ❌ "Cannot find module 'express'"
```bash
npm install express cors node-fetch
```

### ❌ "Port 3001 already in use"
```bash
# Find process on port 3001
lsof -i :3001

# Kill it
kill -9 <PID>

# Or use different port in backend.js
const PORT = 3002;
```

### ❌ "RAPIDAPI_KEY not set"
```bash
# Option 1: Set environment variable
export RAPIDAPI_KEY=c1de5b07c4mshaf2cc987e26b140p1f3411jsn2d3fe0ef9afb

# Option 2: Add to .env file at project root
# Then restart backend: node backend.js
```

### ❌ Still getting CORS error
- Verify backend is running on http://localhost:3001
- Check backend console for errors
- Make sure `RAPIDAPI_KEY` is set correctly
- Try health check: curl http://localhost:3001/health

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `backend.js` | Express server for Instagram scraping |
| `services/backendService.ts` | Frontend service calling backend |
| `pages/ContentDataInsight.tsx` | Updated to use backendService |

---

## 🌐 API Endpoints

### Health Check
```
GET http://localhost:3001/health

Response:
{
  "status": "ok",
  "timestamp": "2026-02-20T10:30:00.000Z"
}
```

### Scrape Instagram Metrics
```
POST http://localhost:3001/api/scrape-instagram

Body:
{
  "username": "reel"
}

Response:
{
  "success": true,
  "data": {
    "username": "reel",
    "views": 0,
    "likes": 271180,
    "comments": 2540,
    "shares": 0,
    "saves": 0,
    "reach": 0,
    "impressions": 0,
    "engagement_rate": "0.93",
    "caption": "...",
    "thumbnail_url": "..."
  },
  "timestamp": "2026-02-20T10:30:00.000Z"
}
```

---

## 🚀 Next Steps

After verifying it works:

1. **Optional**: Deploy backend to a hosting service:
   - Heroku (free tier available)
   - Railway.app
   - Render.com
   - AWS Lambda + API Gateway

2. **Optional**: Set production backend URL in `backendService.ts`:
   ```typescript
   const BACKEND_URL = 'https://your-backend.herokuapp.com';
   ```

3. **Recommended**: Still set up Supabase Edge Function as primary solution in future

---

## 📝 Notes

- ✅ No CORS issues (backend calls API server-side)
- ✅ API key hidden from frontend
- ✅ Instant results (no deployment needed)
- ✅ Real-time metrics still work via Supabase
- ✅ Can easily switch to production backend later

---

## ❓ Questions?

Check console logs:
- Frontend: Browser DevTools (F12)
- Backend: Terminal where `node backend.js` is running

Both will show detailed logs of what's happening!
