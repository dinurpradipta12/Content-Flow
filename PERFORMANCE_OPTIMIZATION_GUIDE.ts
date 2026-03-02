/**
 * 🚀 DATABASE OPTIMIZATION GUIDE - IMPLEMENTASI CEPAT
 * 
 * Panduan langkah-demi-langkah untuk mengoptimasi database connection
 * dan implementasi caching untuk 70-85% performa improvement
 */

// ===============================================
// STEP 1: SETUP DATABASE INDEXES (5 menit)
// ===============================================

/*
1. Login ke Supabase Dashboard
2. Buka SQL Editor
3. Copy-paste isi file: sql/database_indexes_optimization.sql
4. Jalankan (Run)
5. Wait sampai selesai

Expected: Queries 50-70% lebih cepat untuk filtered queries
*/

// ===============================================
// STEP 2: INSTALL REACT QUERY (2 menit)
// ===============================================

/*
Terminal:
npm install @tanstack/react-query

Atau jika sudah install, verify version:
npm list @tanstack/react-query
*/

// ===============================================
// STEP 3: SETUP QUERY CLIENT (10 menit)
// ===============================================

// File baru: src/lib/queryClient.ts

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 menit cache
      gcTime: 1000 * 60 * 10,          // hapus dari memory 10 menit
      retry: 1,                         // retry 1x jika gagal
      refetchOnWindowFocus: false,      // jangan refetch saat tab focus
      refetchOnMount: false,            // jangan refetch saat mount jika cache masih fresh
    },
    mutations: {
      retry: 1,
    },
  },
});

// ===============================================
// STEP 4: UPDATE MAIN.TSX (5 menit)
// ===============================================

/*
// File: main.tsx atau App.tsx

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
*/

// ===============================================
// STEP 5: MIGRATE APPCONFIG KE REACT QUERY (15 menit)
// ===============================================

/*
// File: components/AppConfigProvider.tsx

Ganti dari:
const [config, setConfig] = useState(null);
const [loading, setLoading] = useState(true);

const fetchConfigValue = async () => {
  const { data } = await supabase.from('app_config').select('*').single();
  setConfig(data);
  setLoading(false);
};

useEffect(() => {
  fetchConfigValue();
}, []);

Menjadi:
const { data: config, isLoading: loading } = useQuery({
  queryKey: ['app-config'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  staleTime: 1000 * 60 * 5,  // Cache 5 menit
  refetchInterval: 1000 * 60 * 5,  // Refetch setiap 5 menit
});

// Subscription untuk realtime masih tetap (tapi sekarang bersih):
useEffect(() => {
  if (!config) return;
  
  const channel = supabase.channel('app_config_realtime')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'app_config' },
      () => queryClient.invalidateQueries({ queryKey: ['app-config'] })
    )
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [config]);
*/

// ===============================================
// STEP 6: CREATE CUSTOM HOOKS (30 menit)
// ===============================================

// File baru: src/hooks/useWorkspaces.ts

/*
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export const useWorkspaces = (userId: string | null) => {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      // OPTIMIZED QUERY: Select hanya kolom yang diperlukan
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, platforms, color, account_name, logo_url, owner_id, role, created_at, workspace_type')
        .or(`owner_id.eq.${userId},members.cs.{"${userId}"}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!userId,  // Jangan query jika userId belum ada
    staleTime: 1000 * 60 * 5,  // Cache 5 menit
  });
};

// Cara pakai di component:
// const { data: workspaces, isLoading, error } = useWorkspaces(userId);
*/

// ===============================================
// STEP 7: OPTIMIZE CONTENTPLAN.TSX (20 menit)
// ===============================================

/*
Migrasi dari:

useEffect(() => {
  const fetchData = async () => {
    const wsRes = await supabase.from('workspaces')...
    const contentRes = await supabase.from('content_items')...
    // process semua
  };
  fetchData();
}, []);

Menjadi:

import { useWorkspaces } from '../hooks/useWorkspaces';
import { useQuery } from '@tanstack/react-query';

const ContentPlan = () => {
  const userId = localStorage.getItem('user_id');
  
  // Query 1: Workspaces (cached, 5 menit)
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces(userId);
  
  // Query 2: Content stats (cached, 2 menit)
  const { data: contentStats } = useQuery({
    queryKey: ['content-stats', workspaces?.map(w => w.id)],
    queryFn: async () => {
      const wsIds = workspaces?.map(w => w.id) || [];
      const { data } = await supabase
        .from('content_items')
        .select('workspace_id, status')
        .in('workspace_id', wsIds);
      return data;
    },
    enabled: !!workspaces?.length,
    staleTime: 1000 * 60 * 2,  // Cache 2 menit
  });
  
  // Merge data tanpa loading state yang berubah-ubah
  const mergedData = workspaces?.map(ws => ({
    ...ws,
    stats: contentStats?.filter(c => c.workspace_id === ws.id) || [],
  })) || [];
  
  return (
    <div>
      {wsLoading ? <Skeleton /> : <WorkspaceList data={mergedData} />}
    </div>
  );
};
*/

// ===============================================
// STEP 8: TESTING & VALIDATION (10 menit)
// ===============================================

/*
1. Buka DevTools (F12)
2. Network tab
3. Navigasi antar halaman
4. Lihat apakah requests berkurang (karena caching)

Expected behavior:
- Kunjungan pertama: loading (query database)
- Kunjungan kedua: instant load (dari cache React Query)
- Setelah 5 menit: background refetch (data fresh, tapi tidak blocking UI)

Sebelum optimasi:
- Setiap page load: 2-3 queries ke database
- Total time: 2-5 detik

Sesudah optimasi:
- Page load pertama: 2-3 queries (sama, tapi cepat karena indexes)
- Page load kedua+: 0 queries, instant (dari cache)
- Total time: 0.3-1 detik ✅
*/

// ===============================================
// STEP 9: MONITOR PERFORMANCE (5 menit)
// ===============================================

/*
Install React Query Devtools untuk debugging:

npm install @tanstack/react-query-devtools --save-dev

Tambah di App.tsx:
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>

Sekarang bisa lihat di browser:
- Semua queries yang active
- Cache status (stale/fresh)
- Timing setiap query
*/

// ===============================================
// PRIORITY IMPLEMENTATION ORDER
// ===============================================

/*
✅ HARI 1 (30 menit):
  1. Setup database indexes (sql/database_indexes_optimization.sql)
  2. Optimize column selection (ContentPlan.tsx done ✓)
  3. Install React Query
  
⏳ HARI 2-3 (2-3 jam):
  4. Setup queryClient
  5. Migrate AppConfigProvider
  6. Create useWorkspaces hook
  7. Optimize ContentPlan.tsx
  8. Testing & validation

📋 MINGGU DEPAN:
  9. Migrate lainnya
  10. Setup proper RLS
  11. Implement pagination
  12. Performance monitoring

Expected hasil:
- Day 1: 40-50% improvement (dari indexes)
- Day 3: 70-85% improvement (dari indexes + caching)
*/

// ===============================================
// TROUBLESHOOTING
// ===============================================

/*
Q: "Data tidak update real-time setelah optimasi"
A: Invalidate query saat ada subscription:
   supabase.on('postgres_changes', ...).subscribe(payload => {
     queryClient.invalidateQueries({ queryKey: ['workspaces'] });
   });

Q: "Masih loading ketika switch workspace"
A: Pastikan `queryKey` includes workspace ID:
   useQuery({
     queryKey: ['workspace-detail', workspaceId],  // Include ID
     ...
   });

Q: "Memory terus naik"
A: Set `gcTime` yang lebih rendah:
   gcTime: 1000 * 60 * 3,  // Hapus dari memory 3 menit

Q: "Ingin force refresh?"
A: Gunakan:
   const { refetch } = useQuery({...});
   <button onClick={() => refetch()}>Refresh</button>
*/

export {};
