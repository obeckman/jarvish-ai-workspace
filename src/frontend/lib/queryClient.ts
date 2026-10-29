import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__?: QueryClient;
  }
}

// Lets the TanStack Query browser extension find the client (dev only).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-expect-error ignore type checking for this assignment
  window.__TANSTACK_QUERY_CLIENT__ = import('@tanstack/query-core').QueryClient;
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient