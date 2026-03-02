import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes - cache data dianggap fresh
      gcTime: 1000 * 60 * 10,          // 10 minutes - hapus dari memory setelah 10 menit
      retry: 1,                         // retry 1x jika query gagal
      refetchOnWindowFocus: false,      // jangan refetch saat window focus
      refetchOnMount: false,            // jangan refetch saat component mount
    },
    mutations: {
      retry: 1,
    },
  },
});
