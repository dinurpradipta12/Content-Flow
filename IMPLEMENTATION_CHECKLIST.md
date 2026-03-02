# ✅ IMPLEMENTATION CHECKLIST - DATABASE OPTIMIZATION

## 🎯 PHASE 1: IMMEDIATE (Hari 1 - 30 menit)

### A. Setup Database Indexes
- [ ] Login ke Supabase Dashboard
- [ ] Buka SQL Editor
- [ ] Copy-paste dari: `sql/database_indexes_optimization.sql`
- [ ] Click "Run"
- [ ] Verify: semua 15 indexes berhasil dibuat
- [ ] Expected: 50-70% query improvement langsung

**Time Estimate**: 5-10 menit  
**Difficulty**: ⭐ Easy  
**Impact**: HIGH 📈

---

## 🎯 PHASE 2: SETUP REACT QUERY (Hari 2-3 - 2-3 jam)

### A. Install Dependencies
```bash
npm install @tanstack/react-query
npm install --save-dev @tanstack/react-query-devtools
```
- [ ] Verify install: `npm list @tanstack/react-query`
- [ ] Check version >= 5.0.0

**Time**: 2 menit  
**Status**: ⭐ Super easy

---

### B. Create Query Client Configuration
**File to create**: `src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
```

- [ ] Create file `src/lib/queryClient.ts`
- [ ] Copy code di atas
- [ ] No changes needed, just copy-paste

**Time**: 2 menit  
**Status**: ⭐ Super easy

---

### C. Setup QueryClientProvider
**File to modify**: `main.tsx` atau `App.tsx`

Find this:
```typescript
root.render(
  <App />
);
```

Replace with:
```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

- [ ] Import QueryClientProvider
- [ ] Import ReactQueryDevtools
- [ ] Import queryClient
- [ ] Wrap App dengan QueryClientProvider
- [ ] Add ReactQueryDevtools component
- [ ] Test: app still runs normally

**Time**: 5 menit  
**Status**: ⭐ Super easy

---

## 🎯 PHASE 3: MIGRATE DATA FETCHES (Hari 3-4 - 2-3 jam)

### A. Create Custom Hooks

#### Hook 1: `useWorkspaces`
**File to create**: `src/hooks/useWorkspaces.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export const useWorkspaces = (userId: string | null) => {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, platforms, color, account_name, logo_url, owner_id, role, created_at, workspace_type')
        .or(`owner_id.eq.${userId},members.cs.{"${userId}"}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
```

- [ ] Create file `src/hooks/useWorkspaces.ts`
- [ ] Copy code di atas exactly
- [ ] Test by checking if it compiles

**Time**: 5 menit  
**Status**: ⭐ Super easy

---

#### Hook 2: `useAppConfig`
**File to create**: `src/hooks/useAppConfig.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export const useAppConfig = () => {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
};
```

- [ ] Create file `src/hooks/useAppConfig.ts`
- [ ] Copy code exactly
- [ ] Test compilation

**Time**: 5 menit  
**Status**: ⭐ Super easy

---

### B. Migrate AppConfigProvider
**File to modify**: `components/AppConfigProvider.tsx`

- [ ] Import useQuery: `import { useQuery } from '@tanstack/react-query';`
- [ ] Remove useState for config
- [ ] Replace fetchConfigValue with useQuery hook
- [ ] Keep realtime subscription, just invalidate cache on update
- [ ] Test: AppConfigProvider works, config loads

**Time**: 10 menit  
**Status**: ⭐⭐ Easy

---

### C. Migrate ContentPlan Page
**File to modify**: `pages/ContentPlan.tsx`

- [ ] Import useWorkspaces: `import { useWorkspaces } from '../hooks/useWorkspaces';`
- [ ] Replace fetchData function dengan: `const { data: workspaces, isLoading } = useWorkspaces(userId);`
- [ ] Remove useState for workspaces
- [ ] Keep stats fetching, optimize with useQuery
- [ ] Test: Page loads workspaces from cache on repeat visit

**Time**: 15 menit  
**Status**: ⭐⭐ Easy

---

## 🎯 PHASE 4: TESTING & VALIDATION (Hari 4 - 30 menit)

### A. Performance Testing
- [ ] Open DevTools (F12) → Network tab
- [ ] First load ContentPlan: see 2-3 database queries
- [ ] Wait 5 minutes
- [ ] Navigate away and back: see 0 queries (cached)
- [ ] After 5 mins cache expires: see background refetch
- [ ] Network tab shows: ✅ queries faster (dari indexes)

**Expected**: 70-85% faster page load & navigation

---

### B. React Query Devtools
- [ ] Press Shift+T in browser (React Query Devtools toggle)
- [ ] See all active queries
- [ ] See cache status (stale/fresh)
- [ ] See timing of each query
- [ ] Observe: queries not running on repeat navigation

**Expected**: Visual proof of caching working

---

### C. Memory & Performance
- [ ] Open DevTools → Performance tab
- [ ] Record first load
- [ ] Record second load (cached)
- [ ] Compare timing: should see 70-85% improvement
- [ ] Check memory: not growing excessively

---

## 🎯 PHASE 5: ROLLOUT (Hari 5)

### A. Deploy to Production
- [ ] All tests passing
- [ ] Database indexes created
- [ ] React Query setup complete
- [ ] All major pages migrated
- [ ] Performance validated
- [ ] Commit & push to GitHub
- [ ] Monitor in production

---

### B. Monitor Performance
- [ ] Setup Supabase analytics
- [ ] Monitor query execution times
- [ ] Check database CPU usage
- [ ] Monitor app response times

---

## 📊 PHASE RESULTS TRACKING

| Phase | Action | Time | Impact | ✅ |
|-------|--------|------|--------|-----|
| 1 | Setup Indexes | 5-10m | +50-70% | ☐ |
| 2 | React Query Setup | 15-20m | +70-85% | ☐ |
| 3 | Migrate Hooks | 2-3h | Stabilize | ☐ |
| 4 | Testing | 30m | Validate | ☐ |
| 5 | Production | 1h | Monitor | ☐ |

---

## 🎯 EXPECTED TIMELINE

### Best Case (Aggressive - 1 day):
- Morning: Run indexes (5m)
- Afternoon: React Query + basic migration (3h)
- Evening: Testing (1h)
- **Total**: 4 hours work
- **Result**: 70-85% improvement by Day 1

### Realistic (Normal - 3-4 days):
- Day 1: Indexes + React Query setup (2h)
- Day 2-3: Migrate pages one by one (4h)
- Day 4: Testing & validation (1h)
- **Total**: 7 hours work spread across 4 days
- **Result**: 70-85% improvement by Day 4

---

## 🚨 TROUBLESHOOTING

### Problem: "Still seeing slow queries"
**Solution**: Make sure indexes actually created
```sql
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```
Should show all 15 indexes listed

---

### Problem: "Data not updating real-time"
**Solution**: Invalidate query on subscription update
```typescript
supabase.on('postgres_changes', ...).subscribe(() => {
  queryClient.invalidateQueries({ queryKey: ['workspaces'] });
});
```

---

### Problem: "Memory keeps growing"
**Solution**: Reduce gcTime
```typescript
gcTime: 1000 * 60 * 3,  // 3 minutes instead of 10
```

---

### Problem: "Seeing old data"
**Solution**: Adjust staleTime
```typescript
staleTime: 1000 * 60 * 2,  // 2 minutes instead of 5
```

---

## 📚 RESOURCES

- `DATABASE_PERFORMANCE_ANALYSIS.md` - Detailed analysis
- `PERFORMANCE_OPTIMIZATION_GUIDE.ts` - Code examples
- `sql/database_indexes_optimization.sql` - SQL indexes
- `DATABASE_FIX_SUMMARY_ID.md` - Indonesian summary

---

**Last Updated**: March 2, 2026  
**Difficulty Level**: ⭐⭐ Easy to Moderate  
**Expected Improvement**: 70-85% faster  
**Estimated Time**: 1-4 days depending on aggressiveness
