import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';

/**
 * Hook untuk fetch workspaces milik user
 * Automatically cached selama 5 menit
 * Prevent repeat queries saat navigate antar halaman
 */
export const useWorkspaces = (userId: string | null) => {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const columnList = 'id, name, platforms, color, account_name, logo_url, owner_id, role, created_at, workspace_type, period, description, members, profile_links, account_names';

      // Build membership queries - users can be stored in members by ID, avatar_url, or username
      const userAvatar = localStorage.getItem('user_avatar') || '';
      const userName = localStorage.getItem('user_name') || '';

      // Build parallel queries for owner + member matching
      const queries: PromiseLike<any>[] = [
        // 1. Owner query
        supabase
          .from('workspaces')
          .select(columnList)
          .eq('owner_id', userId)
          .order('created_at', { ascending: false }),
        // 2. Member by userId
        supabase
          .from('workspaces')
          .select(columnList)
          .contains('members', [userId])
          .order('created_at', { ascending: false })
      ];

      // 3. Member by avatar_url (backward compatibility, skip base64 data URLs)
      if (userAvatar && !userAvatar.startsWith('data:')) {
        queries.push(
          supabase
            .from('workspaces')
            .select(columnList)
            .contains('members', [userAvatar])
            .order('created_at', { ascending: false })
        );
      }

      const results = await Promise.all(queries);

      // Check for errors
      for (const res of results) {
        if (res.error) throw res.error;
      }

      // Merge and deduplicate by ID
      const allWorkspaces = results.flatMap(res => res.data || []);
      const uniqueWorkspaces = Array.from(new Map(allWorkspaces.map((ws: any) => [ws.id, ws])).values());

      // Sort by created_at desc
      return uniqueWorkspaces.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!userId,  // Jangan query jika userId belum ada
    staleTime: 1000 * 60 * 5,  // Cache 5 menit
  });
};

/**
 * Hook untuk fetch user preferences
 */
export const useUserPreferences = (userId: string | null) => {
  return useQuery({
    queryKey: ['user-preferences', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const { data, error } = await supabase
        .from('app_users')
        .select('religion, city, timezone, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook untuk fetch content stats per workspace
 */
export const useContentStats = (workspaceIds: string[] | undefined) => {
  return useQuery({
    queryKey: ['content-stats', workspaceIds],
    queryFn: async () => {
      if (!workspaceIds?.length) return {};

      const { data, error } = await supabase
        .from('content_items')
        .select('workspace_id, status')
        .in('workspace_id', workspaceIds);

      if (error) throw error;

      // Transform ke map untuk efficient lookup
      const statsMap: Record<string, { total: number; published: number }> = {};
      (data || []).forEach(item => {
        if (!statsMap[item.workspace_id]) {
          statsMap[item.workspace_id] = { total: 0, published: 0 };
        }
        statsMap[item.workspace_id].total++;
        if (item.status === 'Published') statsMap[item.workspace_id].published++;
      });

      return statsMap;
    },
    enabled: !!workspaceIds?.length,
    staleTime: 1000 * 60 * 2,  // Cache 2 menit (stats berubah lebih sering)
  });
};

/**
 * Hook untuk fetch approval templates
 */
export const useApprovalTemplates = () => {
  return useQuery({
    queryKey: ['approval-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30,  // Cache 30 menit (jarang berubah)
  });
};

/**
 * Hook untuk fetch app config
 */
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
  });
};

/**
 * Hook untuk fetch team KPIs untuk user tertentu
 * Digunakan di Dashboard untuk menampilkan KPI metrics
 */
export const useTeamKpis = (memberId: string | null) => {
  return useQuery({
    queryKey: ['team-kpis', memberId],
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID required');

      const { data, error } = await supabase
        .from('team_kpis')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 2,  // Cache 2 menit (stats sering berubah)
  });
};

/**
 * Hook untuk fetch content items dengan workspace enrichment
 * Digunakan di Aruneeka untuk menampilkan content pipeline
 */
export const useContentItems = (workspaceIds: string[] | undefined) => {
  return useQuery({
    queryKey: ['content-items', workspaceIds],
    queryFn: async () => {
      if (!workspaceIds?.length) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, status, platform, date, pillar, type, pic, priority, workspace_id')
        .in('workspace_id', workspaceIds)
        .order('date', { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceIds?.length,
    staleTime: 1000 * 60 * 2,  // Cache 2 min (content data changes often)
  });
};
