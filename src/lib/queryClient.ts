import { QueryClient } from '@tanstack/react-query';

/** Instância única — usada no logout para `queryClient.clear()` e evitar dados do utilizador anterior. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});
