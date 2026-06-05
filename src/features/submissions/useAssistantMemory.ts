import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../auth/useAuth';

/**
 * Opt-out / transparência da memória do assistente (Fase 1b).
 *
 * Lê quantos fatos de memória persona o utilizador tem nesta franquia
 * (`assistant_persona_memory`, RLS por `profile_id` + `can_access_franchise`)
 * e permite "limpar memória" via **soft delete** (`deleted_at = now()`),
 * decisão LGPD aprovada (auditável, reversível por suporte, sem hard delete).
 *
 * Não traz o conteúdo da memória ao cliente — apenas a contagem (head + count).
 */
function assistantMemoryQueryKey(profileId: string | null, franchiseId: string | null | undefined) {
  return ['assistant-memory', profileId ?? 'anon', franchiseId ?? 'no-franchise'] as const;
}

export function useAssistantMemory(franchiseId: string | null | undefined) {
  const { user } = useAuth();
  const profileId = user?.id ?? null;
  const queryClient = useQueryClient();
  const enabled = Boolean(profileId && franchiseId);

  const countQuery = useQuery({
    queryKey: assistantMemoryQueryKey(profileId, franchiseId),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !profileId || !franchiseId) {
        return 0;
      }
      const { count, error } = await supabase
        .from('assistant_persona_memory')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('franchise_id', franchiseId)
        .is('deleted_at', null);
      if (error) {
        throw error;
      }
      return count ?? 0;
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !profileId || !franchiseId) {
        throw new Error('Sessao indisponivel para limpar a memoria.');
      }
      const { error } = await supabase
        .from('assistant_persona_memory')
        .update({ deleted_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('franchise_id', franchiseId)
        .is('deleted_at', null);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assistantMemoryQueryKey(profileId, franchiseId) });
    },
  });

  const memoryCount = countQuery.data ?? 0;

  return {
    memoryCount,
    hasMemory: memoryCount > 0,
    isLoading: countQuery.isLoading,
    clearMemory: clearMutation.mutateAsync,
    clearing: clearMutation.isPending,
  };
}
