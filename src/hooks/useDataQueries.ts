import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

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
      
      // OPTIMIZED: Select all columns needed for dashboard display
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, platforms, color, account_name, logo_url, owner_id, role, created_at, workspace_type, period, description, members')
        .or(`owner_id.eq.${userId},members.cs.{"${userId}"}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
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
